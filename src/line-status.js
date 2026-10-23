/**
 * Colour thresholds for the load levels reported by the relay servers.
 * Kept in sync with deriveLevel() on the backend.
 */
export const LEVEL_STYLES = {
    low: {
        color: "#10b981",
        icon: "check-circle",
    },
    medium: {
        color: "#eab308",
        icon: "exclamation-circle",
    },
    high: {
        color: "#f97316",
        icon: "exclamation-triangle",
    },
    saturated: {
        color: "#ef4444",
        icon: "times-circle",
    },
    unknown: {
        color: "#9ca3af",
        icon: "question-circle",
    },
};

/**
 * Read the display fields of a line in either payload shape. Admin rows carry
 * lastUsagePercent/lastLoadLevel/lastText/lastChecked, status page rows carry
 * usagePercent/loadLevel/text/updatedAt.
 * @param {object} line Line object
 * @returns {{percent: (number|null), level: string, text: (string|null), updatedAt: (string|null)}} Normalised fields
 */
export function readLineStatus(line) {
    const publicMode = line.usagePercent !== undefined;
    const rawPercent = publicMode ? line.usagePercent : line.lastUsagePercent;
    const rawLevel = publicMode ? line.loadLevel : line.lastLoadLevel;

    let percent = null;
    if (rawPercent !== null && rawPercent !== undefined) {
        const parsed = Number(rawPercent);
        percent = Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed));
    }

    let level;
    if (rawLevel && LEVEL_STYLES[rawLevel]) {
        level = rawLevel;
    } else if (percent === null) {
        level = "unknown";
    } else if (percent < 50) {
        level = "low";
    } else if (percent < 75) {
        level = "medium";
    } else if (percent < 90) {
        level = "high";
    } else {
        level = "saturated";
    }

    return {
        percent,
        level,
        text: (publicMode ? line.text : line.lastText) || null,
        updatedAt: (publicMode ? line.updatedAt : line.lastChecked) || null,
    };
}
