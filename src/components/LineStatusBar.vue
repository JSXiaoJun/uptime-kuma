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

        <div class="line-bar" :class="{ 'line-bar--unknown': percent === null }">
            <div
                class="line-bar-fill"
                :style="{ width: barWidth, backgroundColor: stateColor }"
                :title="`${percent ?? '?'}%`"
            ></div>
        </div>

        <div v-if="showMeta" class="line-meta">
            <span v-if="updatedAt">{{ $t("Last checked") }}: {{ formatTime(updatedAt) }}</span>
            <span v-if="line.endpoint">{{ line.endpoint }}</span>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";
import { LEVEL_STYLES, readLineStatus } from "../line-status.js";

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
         * Show the endpoint and timestamp under the bar.
         */
        showMeta: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        status() {
            return readLineStatus(this.line);
        },
        updatedAt() {
            return this.status.updatedAt;
        },
        percent() {
            return this.status.percent;
        },
        stateStyle() {
            return LEVEL_STYLES[this.status.level];
        },
        stateColor() {
            return this.stateStyle.color;
        },
        stateIcon() {
            return this.stateStyle.icon;
        },
        stateLabel() {
            return this.status.text || this.$t(`Line status level.${this.status.level}`);
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
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .line-state {
        font-size: 13px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        flex: 1 0 auto;
        white-space: nowrap;
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
