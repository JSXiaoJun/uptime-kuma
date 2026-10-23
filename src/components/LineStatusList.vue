<template>
    <div class="shadow-box line-status-list">
        <div v-if="loading" class="list-empty">
            <font-awesome-icon icon="spinner" spin />
            {{ $t("Loading...") }}
        </div>

        <div v-else-if="lines.length === 0" class="list-empty">
            {{ $t("No line status configured yet.") }}
            <br />
            <small class="text-muted">
                {{ $t("Add a line endpoint such as https://hk1.example.com/status.json") }}
            </small>
            <div class="mt-3">
                <button class="btn btn-sm btn-primary" @click="$emit('add')">
                    <font-awesome-icon icon="plus" />
                    {{ $t("Add Line") }}
                </button>
            </div>
        </div>

        <div v-else class="list-body">
            <div v-for="line in lines" :key="line.id" class="line-row" :class="{ disabled: !line.enabled }">
                <LineStatusBar :line="line" />

                <div class="line-footer">
                    <div class="line-meta">
                        <span v-if="line.lastChecked">
                            {{ $t("Last checked") }}: {{ formatTime(line.lastChecked) }}
                        </span>
                        <span v-if="line.endpoint" class="line-endpoint" :title="line.endpoint">
                            {{ line.endpoint }}
                        </span>
                    </div>

                    <div class="line-actions">
                        <span class="badge" :class="line.enabled ? 'bg-success' : 'bg-secondary'">
                            {{ line.enabled ? $t("Enabled") : $t("Disabled") }}
                        </span>

                        <button
                            class="btn btn-sm btn-outline-secondary"
                            :title="$t('Refresh now')"
                            :aria-label="$t('Refresh now')"
                            :disabled="refreshing[line.id]"
                            @click="refresh(line)"
                        >
                            <font-awesome-icon icon="undo" :spin="refreshing[line.id]" />
                        </button>

                        <button
                            class="btn btn-sm btn-outline-secondary"
                            :title="$t('Edit')"
                            :aria-label="$t('Edit')"
                            @click="$emit('edit', line)"
                        >
                            <font-awesome-icon icon="pen" />
                        </button>

                        <button
                            class="btn btn-sm btn-outline-danger"
                            :title="$t('Delete')"
                            :aria-label="$t('Delete')"
                            @click="confirmDelete(line)"
                        >
                            <font-awesome-icon icon="trash" />
                        </button>
                    </div>
                </div>

                <div v-if="line.lastError" class="line-error">
                    <font-awesome-icon icon="exclamation-triangle" />
                    {{ line.lastError }}
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import dayjs from "dayjs";
import LineStatusBar from "./LineStatusBar.vue";
import { useToast } from "vue-toastification";

export default {
    name: "LineStatusList",
    components: {
        LineStatusBar,
    },
    emits: ["add", "edit", "loaded"],
    data() {
        return {
            loading: true,
            refreshing: {},
            toast: useToast(),
        };
    },
    computed: {
        /**
         * Lines from the admin catalogue, kept in the shared root state so the
         * status page editor and this list always agree.
         * @returns {object[]} Lines
         */
        lines() {
            return Array.isArray(this.$root.lineStatusList) ? this.$root.lineStatusList : [];
        },
    },
    mounted() {
        this.load();
    },
    methods: {
        /**
         * Format a datetime in the browser's timezone.
         * @param {string} value Raw UTC datetime
         * @returns {string} Formatted time
         */
        formatTime(value) {
            const parsed = dayjs.utc(value);
            return parsed.isValid() ? parsed.local().format("YYYY-MM-DD HH:mm") : value;
        },
        /**
         * Ask the server for the current list.
         * @returns {void}
         */
        load() {
            this.$root.getSocket().emit("getLineStatusList", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.$root.lineStatusList = res.data;
                    this.$emit("loaded", res.data);
                } else {
                    this.toast.error(res.msg);
                }
            });
        },
        /**
         * Force an immediate poll for a single line.
         * @param {object} line Line to refresh
         * @returns {void}
         */
        refresh(line) {
            this.refreshing = { ...this.refreshing, [line.id]: true };
            this.$root.getSocket().emit("refreshLineStatus", line.id, (res) => {
                this.refreshing = { ...this.refreshing, [line.id]: false };
                if (res.ok) {
                    this.toast.success(this.$t("Refreshed"));
                } else {
                    this.toast.error(res.msg);
                }
            });
        },
        /**
         * Delete a line after confirmation.
         * @param {object} line Line to delete
         * @returns {void}
         */
        confirmDelete(line) {
            const name = line.displayName || line.name;
            if (!window.confirm(this.$t("Delete line {name}? History will be removed.", { name }))) {
                return;
            }
            this.$root.getSocket().emit("deleteLineStatus", line.id, (res) => {
                if (res.ok) {
                    this.toast.success(this.$t("successDeleted"));
                } else {
                    this.toast.error(res.msg);
                }
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.line-status-list {
    display: flex;
    flex-direction: column;
    padding: 0;

    .list-empty {
        padding: 32px 16px;
        text-align: center;
        opacity: 0.75;
        font-size: 14px;
    }

    .list-body {
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        padding: 8px;
    }

    .line-row {
        padding: 6px 4px 10px;
        border-radius: 10px;
        transition: background-color ease-in-out 0.15s;

        & + .line-row {
            margin-top: 4px;
        }

        &:hover {
            background-color: rgba(140, 140, 140, 0.08);
        }

        &.disabled {
            opacity: 0.55;
        }
    }

    .line-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 0 12px;
    }

    .line-meta {
        display: flex;
        flex-direction: column;
        min-width: 0;
        font-size: 12px;
        opacity: 0.7;
    }

    .line-endpoint {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .line-actions {
        display: flex;
        align-items: center;
        flex-shrink: 0;
        gap: 6px;
    }

    .line-error {
        font-size: 12px;
        color: #ef4444;
        margin-top: 6px;
        padding: 0 12px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
}
</style>
