<template>
    <div class="group-lines">
        <!-- Same row layout as the monitor rows; the right column is a load bar instead of heartbeats -->
        <div v-for="line in rows" :key="'line-' + line.id" class="item" data-testid="line">
            <div class="row">
                <div class="col-9 col-xl-6 small-padding">
                    <div class="info">
                        <font-awesome-icon
                            v-if="editMode"
                            icon="times"
                            class="action remove me-3"
                            :title="$t('Remove')"
                            @click="$emit('remove', Number(line.id))"
                        />
                        <span
                            class="badge rounded-pill line-pill"
                            :style="{ backgroundColor: line.color }"
                            :title="line.label"
                        >
                            {{ line.percentText }}
                        </span>
                        <p class="item-name" :title="line.name">{{ line.name }}</p>
                    </div>
                </div>
                <div class="col-3 col-xl-6">
                    <div
                        class="load-bar"
                        :class="{ 'load-bar--unknown': line.percent === null }"
                        role="progressbar"
                        :aria-label="line.name"
                        aria-valuemin="0"
                        aria-valuemax="100"
                        :aria-valuenow="line.percent ?? undefined"
                        :aria-valuetext="`${line.percentText} ${line.label}`"
                    >
                        <div class="load-bar-fill" :style="{ width: line.barWidth, backgroundColor: line.color }"></div>
                    </div>
                    <div v-if="!$root.isMobile" class="load-bar-word">
                        <span :style="{ color: line.color }">
                            <font-awesome-icon :icon="line.icon" />
                            {{ line.label }}
                        </span>
                        <span v-if="line.updatedAt">{{ timeAgo(line.updatedAt) }}</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- Picker -->
        <div v-if="editMode" class="add-line-row">
            <select v-if="options.length > 0" class="form-select form-select-sm" :value="''" @change="onPick">
                <option value="">{{ $t("Add a line to this group...") }}</option>
                <option v-for="opt in options" :key="opt.id" :value="opt.id">
                    {{ opt.displayName || opt.name }}
                </option>
            </select>
            <small v-else-if="catalogueLoaded && catalogue.length === 0" class="text-muted">
                {{ $t("No line status configured yet.") }}
                <a href="/dashboard" target="_blank" rel="noopener noreferrer">
                    {{ $t("Add a line in the dashboard") }}
                </a>
            </small>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";
import { LEVEL_STYLES, readLineStatus } from "../line-status.js";

/**
 * Renders (and, in edit mode, edits) the relay lines attached to a status page
 * group.
 *
 * The catalogue of available lines is fetched by this component itself instead
 * of being read from `$root`. Status pages skip the socket mixin, so a value
 * pushed into `$root` by the dashboard is not guaranteed to be present here;
 * fetching locally keeps the picker working regardless of navigation order.
 *
 * Assignment changes are emitted rather than written directly, because `group`
 * is a prop owned by the parent (which persists it via saveStatusPage).
 */
export default {
    name: "GroupLines",
    props: {
        /** The group object from publicGroupList */
        group: {
            type: Object,
            required: true,
        },
        /** Are we in edit mode? */
        editMode: {
            type: Boolean,
            default: false,
        },
    },
    emits: ["add", "remove"],
    data() {
        return {
            // Full catalogue of configured lines
            catalogue: [],
            // Whether the catalogue request has succeeded at least once
            catalogueLoaded: false,
            // How many times we have retried fetching the catalogue
            retries: 0,
        };
    },
    computed: {
        /**
         * Lines already attached to this group.
         * @returns {object[]} Assigned lines
         */
        lines() {
            const list = this.group && this.group.lineList;
            return Array.isArray(list) ? list : [];
        },
        /**
         * Assigned lines with their display values resolved.
         * @returns {object[]} Rows to render
         */
        rows() {
            return this.lines.map((line) => {
                const status = readLineStatus(line);
                const style = LEVEL_STYLES[status.level];
                return {
                    id: line.id,
                    name: line.displayName || line.name,
                    percent: status.percent,
                    percentText: status.percent === null ? "--%" : `${status.percent}%`,
                    barWidth: status.percent === null ? "0%" : `${Math.max(2, status.percent)}%`,
                    label: status.text || this.$t(`Line status level.${status.level}`),
                    color: style.color,
                    icon: style.icon,
                    updatedAt: status.updatedAt,
                };
            });
        },
        /**
         * Lines that can still be added to this group.
         * @returns {object[]} Selectable lines
         */
        options() {
            const assigned = new Set(this.lines.map((line) => Number(line.id)));
            return this.catalogue.filter((line) => !assigned.has(Number(line.id)));
        },
    },
    watch: {
        editMode: {
            immediate: true,
            handler(val) {
                if (val) {
                    this.fetchCatalogue();
                }
            },
        },
    },
    methods: {
        /**
         * Relative time in the same wording as the heartbeat bar ("now", "3m ago").
         * @param {string} value UTC datetime
         * @returns {string} Relative time
         */
        timeAgo(value) {
            const seconds = dayjs().diff(dayjs.utc(value), "seconds");
            if (seconds < 60 * 2) {
                return this.$t("now");
            } else if (seconds < 60 * 60) {
                return this.$t("time ago", [(seconds / 60).toFixed(0) + "m"]);
            }
            return this.$t("time ago", [(seconds / 60 / 60).toFixed(0) + "h"]);
        },
        /**
         * Ask the server for the line catalogue, retrying while the socket is
         * still connecting (entering edit mode initialises it asynchronously).
         * @returns {void}
         */
        fetchCatalogue() {
            const viaGetter = this.$root.getSocket ? this.$root.getSocket() : null;
            const socket = viaGetter || this.$root.socket;
            if (!socket || typeof socket.emit !== "function" || !socket.connected) {
                if (this.retries < 40) {
                    this.retries++;
                    setTimeout(() => this.fetchCatalogue(), 500);
                }
                return;
            }
            socket.emit("getLineStatusList", (res) => {
                if (res && res.ok && Array.isArray(res.data)) {
                    // Only enabled lines can be attached to a status page.
                    this.catalogue = res.data.filter((line) => line.enabled !== false);
                    this.catalogueLoaded = true;
                    this.retries = 0;
                } else if (this.retries < 40) {
                    this.retries++;
                    setTimeout(() => this.fetchCatalogue(), 500);
                }
            });
        },
        /**
         * Ask the parent to attach the picked line.
         * @param {Event} event Change event from the select element
         * @returns {void}
         */
        onPick(event) {
            const id = Number(event.target.value);
            event.target.value = "";
            if (!id) {
                return;
            }
            const found = this.catalogue.find((line) => Number(line.id) === id);
            if (!found) {
                return;
            }
            this.$emit("add", {
                id: found.id,
                name: found.name,
                displayName: found.displayName,
                loadLevel: found.lastLoadLevel,
                status: found.lastStatus,
                text: found.lastText,
                usagePercent: found.lastUsagePercent,
                updatedAt: found.lastChecked,
            });
        },
    },
};
</script>

<style lang="scss" scoped>
@import "../assets/vars.scss";

.item-name {
    padding-left: 5px;
    padding-right: 5px;
    margin: 0;
    display: inline-block;
}

.remove {
    color: $danger;
    cursor: pointer;
}

.line-pill {
    color: #fff;
}

/* Height and vertical position match the "mid" heartbeat bar next to it */
.load-bar {
    height: 16px;
    margin-top: 4px;
    border-radius: 50rem;
    background-color: #f0f8ff;
    overflow: hidden;

    .dark & {
        background-color: #848484;
    }

    &--unknown {
        opacity: 0.4;
    }
}

.load-bar-fill {
    height: 100%;
    border-radius: 50rem;
    transition:
        width 0.6s ease,
        background-color 0.3s ease;
}

.load-bar-word {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    color: $secondary-text;
    font-size: 12px;
    white-space: nowrap;
}

.add-line-row {
    padding: 10px 15px;
    border-top: 1px solid rgba(140, 140, 140, 0.1);
}
</style>
