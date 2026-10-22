const axios = require("axios");
const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { log } = require("../../src/util");
const LineStatus = require("../model/line_status");

// Timestamps are stored in UTC, so the utc plugin must be enabled before
// parsing `last_checked` below.
dayjs.extend(utc);

const DEFAULT_INTERVAL_SECONDS = 300;
const MIN_INTERVAL_SECONDS = 60;
const REQUEST_TIMEOUT_MS = 8000;

/**
 * Poll every enabled line whose own interval has elapsed.
 *
 * The scheduler fires once a minute and each line decides whether it is due,
 * which lets every line keep an independently configurable sample interval.
 * @returns {Promise<void>}
 */
async function pollLineStatus() {
    let lines;
    try {
        lines = await LineStatus.listAll(true);
    } catch (e) {
        log.error("line-status", `Unable to load lines: ${e.message}`);
        return;
    }

    if (lines.length === 0) {
        return;
    }

    const now = dayjs();

    for (const line of lines) {
        const interval = Math.max(MIN_INTERVAL_SECONDS, Number(line.interval_seconds) || DEFAULT_INTERVAL_SECONDS);

        // Skip lines that are not due yet.
        if (line.last_checked) {
            const elapsed = now.diff(dayjs.utc(line.last_checked), "second");
            if (elapsed < interval - 5) {
                continue;
            }
        }

        try {
            const result = await fetchLineStatus(line.endpoint);
            await LineStatus.recordSample(line.id, result);
            log.debug("line-status", `${line.name}: ${result.usagePercent}% (${result.loadLevel})`);
        } catch (e) {
            log.warn("line-status", `${line.name}: poll failed - ${e.message}`);
            await LineStatus.recordError(line.id, e.message);
        }
    }
}

/**
 * Fetch and normalise one line status document.
 * @param {string} endpoint Absolute URL of the status JSON
 * @returns {Promise<object>} Normalised poll result
 */
async function fetchLineStatus(endpoint) {
    const response = await axios.get(endpoint, {
        timeout: REQUEST_TIMEOUT_MS,
        responseType: "json",
        headers: {
            "User-Agent": "uptime-kuma-line-status",
            "Cache-Control": "no-store",
        },
    });

    const data = response.data ?? {};

    const rawPercent = data.usage_percent ?? data.usagePercent ?? null;
    let usagePercent = null;
    if (rawPercent !== null && rawPercent !== undefined && rawPercent !== "") {
        const parsed = Number(rawPercent);
        if (!Number.isNaN(parsed)) {
            usagePercent = Math.max(0, Math.min(100, Math.round(parsed * 100) / 100));
        }
    }

    let loadLevel = data.load_level || data.loadLevel || null;
    let status = data.status || null;
    let text = data.text || "";

    // Fall back to deriving the level when the endpoint only reports a number.
    if ((!loadLevel || !status || !text) && usagePercent !== null) {
        const derived = deriveLevel(usagePercent);
        loadLevel = loadLevel || derived.level;
        status = status || derived.status;
        text = text || derived.text;
    }

    return {
        usagePercent,
        loadLevel: loadLevel || "unknown",
        status: status || "unknown",
        text: text || "",
    };
}

/**
 * Map a usage percentage to a level using the agreed thresholds:
 * below 50% low, below 75% medium, below 90% high, otherwise saturated.
 * @param {number} percent Load percentage
 * @returns {{level: string, status: string, text: string}} Derived values
 */
function deriveLevel(percent) {
    if (percent < 50) {
        return {
            level: "low",
            status: "normal",
            text: "线路畅通",
        };
    }
    if (percent < 75) {
        return {
            level: "medium",
            status: "normal",
            text: "使用正常",
        };
    }
    if (percent < 90) {
        return {
            level: "high",
            status: "busy",
            text: "线路较忙",
        };
    }
    return {
        level: "saturated",
        status: "congested",
        text: "线路拥堵",
    };
}

module.exports = {
    pollLineStatus,
    fetchLineStatus,
    deriveLevel,
    DEFAULT_INTERVAL_SECONDS,
    MIN_INTERVAL_SECONDS,
};
