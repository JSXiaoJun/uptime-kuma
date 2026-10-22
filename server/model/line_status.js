const dayjs = require("dayjs");
const utc = require("dayjs/plugin/utc");
const { BeanModel } = require("redbean-node/dist/bean-model");
const { R } = require("redbean-node");
const { SQL_DATETIME_FORMAT, log } = require("../../src/util");

dayjs.extend(utc);

/**
 * A relayed "line" whose bandwidth usage is reported by a remote JSON
 * endpoint (the `status.json` produced on each relay server).
 *
 * The reported percentage is informational only. It is never used to change
 * the UP/DOWN state of a monitor, so it deliberately lives outside the
 * Monitor tables.
 */
class LineStatus extends BeanModel {
    /**
     * Human readable label used in the UI.
     * @returns {string} Display name, falling back to the raw name
     */
    getTitle() {
        return this.display_name || this.name;
    }

    /**
     * Serialise everything needed by the admin dashboard.
     * @returns {object} JSON representation
     */
    toJSON() {
        return {
            id: this.id,
            name: this.name,
            displayName: this.getTitle(),
            endpoint: this.endpoint,
            capacityMbps: this.capacity_mbps,
            intervalSeconds: this.interval_seconds,
            enabled: this.enabled === 1,
            weight: this.weight,
            createdDate: this.created_date,
            lastChecked: this.last_checked,
            lastError: this.last_error,
            lastUsagePercent: this.last_usage_percent === null ? null : Number(this.last_usage_percent),
            lastLoadLevel: this.last_load_level,
            lastStatus: this.last_status,
            lastText: this.last_text,
        };
    }

    /**
     * Reduced representation exposed on public status pages.
     * Omits `endpoint` so relay hosts are never leaked to visitors.
     * @returns {object} JSON representation
     */
    toPublicJSON() {
        return {
            id: this.id,
            name: this.name,
            displayName: this.getTitle(),
            loadLevel: this.last_load_level || "unknown",
            status: this.last_status || "unknown",
            text: this.last_text || "",
            usagePercent: this.last_usage_percent === null ? null : Number(this.last_usage_percent),
            updatedAt: this.last_checked,
        };
    }

    /**
     * Return every line, ordered for display.
     * @param {boolean} onlyEnabled Restrict to enabled lines
     * @returns {Promise<LineStatus[]>} List of lines
     */
    static async listAll(onlyEnabled = false) {
        let sql = "SELECT * FROM line_status";
        if (onlyEnabled) {
            sql += " WHERE enabled = 1";
        }
        sql += " ORDER BY weight, id";
        return R.convertToBeans("line_status", await R.getAll(sql));
    }

    /**
     * Load a single line by id.
     * @param {number} id Line id
     * @returns {Promise<LineStatus|null>} The line or null
     */
    static async findById(id) {
        const bean = await R.findOne("line_status", " id = ? ", [id]);
        return bean || null;
    }

    /**
     * Persist a successful poll and mirror the latest values onto the line row
     * so that list reads stay cheap.
     * @param {number} lineId Line id
     * @param {object} result Poll result
     * @returns {Promise<void>}
     */
    static async recordSample(lineId, result) {
        const sample = R.dispense("line_status_sample");
        sample.line_id = lineId;
        sample.usage_percent = result.usagePercent;
        sample.load_level = result.loadLevel;
        sample.status = result.status;
        sample.text = result.text;
        sample.sample_time = nowSql();
        await R.store(sample);

        const line = await LineStatus.findById(lineId);
        if (line) {
            line.last_checked = nowSql();
            line.last_usage_percent = result.usagePercent;
            line.last_load_level = result.loadLevel;
            line.last_status = result.status;
            line.last_text = result.text;
            line.last_error = "";
            await R.store(line);
        }
    }

    /**
     * Record a failed poll while keeping the last known good sample.
     * @param {number} lineId Line id
     * @param {string} error Error message
     * @returns {Promise<void>}
     */
    static async recordError(lineId, error) {
        const line = await LineStatus.findById(lineId);
        if (line) {
            line.last_checked = nowSql();
            line.last_error = String(error).substring(0, 1000);
            await R.store(line);
        }
    }

    /**
     * Samples for a line within a time window.
     * @param {number} lineId Line id
     * @param {number} hours How many hours back to look
     * @returns {Promise<object[]>} Samples ordered by time
     */
    static async getSamples(lineId, hours = 24) {
        const rows = await R.getAll(
            `
            SELECT usage_percent, load_level, status, text, sample_time
            FROM line_status_sample
            WHERE line_id = ?
              AND sample_time >= ?
            ORDER BY sample_time
        `,
            [lineId, hoursAgoSql(hours)]
        );
        return rows.map((row) => ({
            usagePercent: row.usage_percent === null ? null : Number(row.usage_percent),
            loadLevel: row.load_level,
            status: row.status,
            text: row.text,
            sampleTime: row.sample_time,
        }));
    }

    /**
     * Drop samples older than the retention window.
     * @param {number} days Retention in days
     * @returns {Promise<void>}
     */
    static async pruneOldSamples(days = 7) {
        try {
            await R.exec("DELETE FROM line_status_sample WHERE sample_time < ?", [daysAgoSql(days)]);
        } catch (e) {
            log.warn("line-status", `Failed to prune old samples: ${e.message}`);
        }
    }

    /**
     * Lines attached to a public status page group.
     * @param {number} groupId Group id
     * @returns {Promise<LineStatus[]>} List of lines
     */
    static async listByGroup(groupId) {
        return R.convertToBeans(
            "line_status",
            await R.getAll(
                `
                SELECT line_status.* FROM line_status, group_line
                WHERE line_status.id = group_line.line_id
                  AND group_line.group_id = ?
                ORDER BY group_line.weight
            `,
                [groupId]
            )
        );
    }
}

/**
 * Timestamps are stored in UTC, matching the rest of the application.
 * @returns {string} Current time in SQL datetime format
 */
function nowSql() {
    return dayjs.utc().format(SQL_DATETIME_FORMAT);
}

/**
 * @param {number} hours Hours to subtract from now
 * @returns {string} Datetime in SQL format
 */
function hoursAgoSql(hours) {
    return dayjs.utc().subtract(hours, "hour").format(SQL_DATETIME_FORMAT);
}

/**
 * @param {number} days Days to subtract from now
 * @returns {string} Datetime in SQL format
 */
function daysAgoSql(days) {
    return dayjs.utc().subtract(days, "day").format(SQL_DATETIME_FORMAT);
}

module.exports = LineStatus;
