<template>
    <div class="line-status-item">
        <div class="line-status-head">
            <span class="line-name" :title="line.displayName || line.name">
                {{ line.displayName || line.name }}
            </span>
            <span class="line-state" :style="{ color: stateColor }">
                <font-awesome-icon :icon="stateIcon" />
                {{ stateLabel }}
            </span>
            <span class="line-percent" :style="{ color: stateColor }">
                {{ displayPercent }}
            </span>
        </div>

        <div class="line-bar" :class="{ 'line-bar--unknown': line.usagePercent === null }">
            <div
                class="line-bar-fill"
                :style="{ width: barWidth, backgroundColor: stateColor }"
                :title="`${line.usagePercent ?? '?'}%`"
            ></div>
        </div>

        <div v-if="showMeta" class="line-meta">
            <span v-if="line.updatedAt">{{ $t("Last checked") }}: {{ formatTime(line.updatedAt) }}</span>
            <span v-if="line.endpoint">{{ line.endpoint }}</span>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";

/**
 * Colour thresholds for the load levels reported by the relay servers.
 * Kept in sync with deriveLevel() on the backend.
 */
const LEVEL_STYLES = {
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

export default {
    name: "LineStatusBar",
    props: {
        /**
         * A line object. Admin mode uses lastUsagePercent/lastLoadLevel/endpoint,
         * public status pages use usagePercent/loadLevel.
         */
        line: {
            type: Object,
            required: true,
        },
        /**
         * Hide the endpoint and timestamp (used on public status pages).
         */
        showMeta: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        publicMode() {
            return this.line.usagePercent !== undefined;
        },
        percent() {
            const value = this.publicMode ? this.line.usagePercent : this.line.lastUsagePercent;
            if (value === null || value === undefined) {
                return null;
            }
            const parsed = Number(value);
            return Number.isNaN(parsed) ? null : Math.max(0, Math.min(100, parsed));
        },
        level() {
            const raw = this.publicMode ? this.line.loadLevel : this.line.lastLoadLevel;
            if (raw && LEVEL_STYLES[raw]) {
                return raw;
            }
            if (this.percent === null) {
                return "unknown";
            }
            if (this.percent < 50) {
                return "low";
            }
            if (this.percent < 75) {
                return "medium";
            }
            if (this.percent < 90) {
                return "high";
            }
            return "saturated";
        },
        stateStyle() {
            return LEVEL_STYLES[this.level] || LEVEL_STYLES.unknown;
        },
        stateColor() {
            return this.stateStyle.color;
        },
        stateIcon() {
            return this.stateStyle.icon;
        },
        stateLabel() {
            const text = this.publicMode ? this.line.text : this.line.lastText;
            if (text) {
                return text;
            }
            return this.$t(`Line status level.${this.level}`);
        },
        displayPercent() {
            if (this.percent === null) {
                return "--%";
            }
            return `${this.percent}%`;
        },
        barWidth() {
            if (this.percent === null) {
                return "0%";
            }
            return `${Math.max(2, this.percent)}%`;
        },
    },
    methods: {
        /**
         * Format a datetime for the admin tooltip.
         * @param {string} value Raw datetime
         * @returns {string} Formatted time
         */
        formatTime(value) {
            if (!value) {
                return "";
            }
            const parsed = dayjs.utc(value);
            return parsed.isValid() ? parsed.local().format("YYYY-MM-DD HH:mm") : value;
        },
    },
};
</script>

<style lang="scss" scoped>
.line-status-item {
    padding: 10px 12px;

    .line-status-head {
        display: flex;
        align-items: center;
        gap: 10px;
        font-size: 14px;
        margin-bottom: 6px;
    }

    .line-name {
        font-weight: 600;
        max-width: 180px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .line-state {
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex: 1;
    }

    .line-percent {
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        min-width: 46px;
        text-align: right;
    }

    .line-bar {
        height: 8px;
        border-radius: 4px;
        background-color: rgba(140, 140, 140, 0.2);
        overflow: hidden;

        &--unknown {
            opacity: 0.4;
        }
    }

    .line-bar-fill {
        height: 100%;
        border-radius: 4px;
        transition:
            width 0.6s ease,
            background-color 0.3s ease;
    }

    .line-meta {
        margin-top: 6px;
        font-size: 12px;
        opacity: 0.7;
        display: flex;
        justify-content: space-between;
        gap: 10px;

        span:last-child {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
}
</style>
