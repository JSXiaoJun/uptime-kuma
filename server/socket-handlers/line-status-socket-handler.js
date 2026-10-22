const { checkLogin } = require("../util-server");
const { log } = require("../../src/util");
const { R } = require("redbean-node");
const apicache = require("../modules/apicache");
const LineStatus = require("../model/line_status");
const { fetchLineStatus, DEFAULT_INTERVAL_SECONDS, MIN_INTERVAL_SECONDS } = require("../jobs/line-status");
const { sendLineStatusList } = require("../client");

/**
 * Validate and normalise the payload sent from the admin UI.
 * @param {object} data Raw payload
 * @returns {object} Normalised fields
 * @throws {Error} When a field is invalid
 */
function normalisePayload(data) {
    const name = String(data?.name ?? "").trim();
    if (!name) {
        throw new Error("Line name is required.");
    }
    if (name.length > 255) {
        throw new Error("Line name is too long.");
    }

    const endpoint = String(data?.endpoint ?? "").trim();
    if (!/^https?:\/\/.+/i.test(endpoint)) {
        throw new Error("Endpoint must be an absolute http(s) URL.");
    }
    if (endpoint.length > 1024) {
        throw new Error("Endpoint is too long.");
    }

    const displayName = String(data?.displayName ?? "")
        .trim()
        .substring(0, 255);

    let capacityMbps = Number(data?.capacityMbps ?? 80);
    if (!Number.isFinite(capacityMbps) || capacityMbps <= 0 || capacityMbps > 100000) {
        capacityMbps = 80;
    }

    let intervalSeconds = Number(data?.intervalSeconds ?? DEFAULT_INTERVAL_SECONDS);
    if (!Number.isFinite(intervalSeconds)) {
        intervalSeconds = DEFAULT_INTERVAL_SECONDS;
    }
    intervalSeconds = Math.max(MIN_INTERVAL_SECONDS, Math.min(86400, Math.round(intervalSeconds)));

    return {
        name,
        displayName,
        endpoint,
        capacityMbps: Math.round(capacityMbps),
        intervalSeconds,
        enabled: data?.enabled === false ? 0 : 1,
    };
}

/**
 * Handlers for the line status (relay bandwidth) feature
 * @param {Socket} socket Socket.io instance
 * @returns {void}
 */
module.exports.lineStatusSocketHandler = (socket) => {
    socket.on("getLineStatusList", async (callback) => {
        try {
            checkLogin(socket);
            const result = await sendLineStatusList(socket);
            callback({
                ok: true,
                data: result,
            });
        } catch (e) {
            log.error("line-status", e);
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("addLineStatus", async (data, callback) => {
        try {
            checkLogin(socket);
            const fields = normalisePayload(data);

            const bean = R.dispense("line_status");
            bean.name = fields.name;
            bean.display_name = fields.displayName;
            bean.endpoint = fields.endpoint;
            bean.capacity_mbps = fields.capacityMbps;
            bean.interval_seconds = fields.intervalSeconds;
            bean.enabled = fields.enabled;
            bean.weight = 1;
            await R.store(bean);

            log.info("line-status", `Added line: ${fields.name}`);
            apicache.clear();

            // Probe immediately so the UI has data without waiting a full interval.
            try {
                const result = await fetchLineStatus(fields.endpoint);
                await LineStatus.recordSample(bean.id, result);
            } catch (e) {
                log.warn("line-status", `Initial probe failed for ${fields.name}: ${e.message}`);
                await LineStatus.recordError(bean.id, e.message);
            }

            callback({
                ok: true,
                msg: "successAdded",
                msgi18n: true,
                id: bean.id,
            });

            await sendLineStatusList(socket);
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("editLineStatus", async (id, data, callback) => {
        try {
            checkLogin(socket);
            const line = await LineStatus.findById(id);
            if (!line) {
                throw new Error("Line not found.");
            }

            const fields = normalisePayload(data);
            line.name = fields.name;
            line.display_name = fields.displayName;
            line.endpoint = fields.endpoint;
            line.capacity_mbps = fields.capacityMbps;
            line.interval_seconds = fields.intervalSeconds;
            line.enabled = fields.enabled;
            await R.store(line);

            log.info("line-status", `Edited line: ${fields.name}`);
            apicache.clear();

            callback({
                ok: true,
                msg: "Saved.",
            });

            await sendLineStatusList(socket);
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("deleteLineStatus", async (id, callback) => {
        try {
            checkLogin(socket);
            const line = await LineStatus.findById(id);
            if (!line) {
                throw new Error("Line not found.");
            }

            await R.exec("DELETE FROM line_status_sample WHERE line_id = ?", [id]);
            await R.exec("DELETE FROM group_line WHERE line_id = ?", [id]);
            await R.exec("DELETE FROM line_status WHERE id = ?", [id]);

            log.info("line-status", `Deleted line: ${line.name}`);
            apicache.clear();

            callback({
                ok: true,
                msg: "successDeleted",
                msgi18n: true,
            });

            await sendLineStatusList(socket);
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("refreshLineStatus", async (id, callback) => {
        try {
            checkLogin(socket);
            const line = await LineStatus.findById(id);
            if (!line) {
                throw new Error("Line not found.");
            }

            const result = await fetchLineStatus(line.endpoint);
            await LineStatus.recordSample(id, result);

            callback({
                ok: true,
                data: result,
            });

            await sendLineStatusList(socket);
        } catch (e) {
            log.warn("line-status", `Manual refresh failed: ${e.message}`);
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    socket.on("getLineStatusHistory", async (id, hours, callback) => {
        try {
            checkLogin(socket);
            const samples = await LineStatus.getSamples(id, Number(hours) || 24);
            callback({
                ok: true,
                data: samples,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });

    // Attach / detach a line to a public status page group, mirroring how
    // monitors are assigned to groups.
    socket.on("toggleLineStatusGroup", async (groupId, lineId, enabled, callback) => {
        try {
            checkLogin(socket);
            if (enabled) {
                const existing = await R.getRow("SELECT id FROM group_line WHERE group_id = ? AND line_id = ?", [
                    groupId,
                    lineId,
                ]);
                if (!existing) {
                    const bean = R.dispense("group_line");
                    bean.group_id = groupId;
                    bean.line_id = lineId;
                    bean.weight = 1;
                    await R.store(bean);
                }
            } else {
                await R.exec("DELETE FROM group_line WHERE group_id = ? AND line_id = ?", [groupId, lineId]);
            }

            apicache.clear();
            callback({
                ok: true,
            });
        } catch (e) {
            callback({
                ok: false,
                msg: e.message,
            });
        }
    });
};
