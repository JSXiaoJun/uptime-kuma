<template>
    <div class="shadow-box line-status-list">
        <div class="list-header">
            <h5 class="list-title">
                <font-awesome-icon icon="network-wired" />
                {{ $t("Line status") }}
            </h5>
            <button class="btn btn-sm btn-primary" :disabled="loading" @click="$emit('add')">
                <font-awesome-icon icon="plus" />
                {{ $t("Add Line") }}
            </button>
        </div>

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
        </div>

        <div v-else class="list-body">
            <div v-for="line in lines" :key="line.id" class="line-row">
                <LineStatusBar :line="line" :show-meta="true" />

                <div class="line-actions">
                    <span class="badge" :class="line.enabled ? 'bg-success' : 'bg-secondary'">
                        {{ line.enabled ? $t("Enabled") : $t("Disabled") }}
                    </span>

                    <button
                        class="btn btn-sm btn-outline-secondary"
                        :title="$t('Refresh now')"
                        :disabled="refreshing[line.id]"
                        @click="refresh(line)"
                    >
                        <font-awesome-icon icon="undo" :spin="refreshing[line.id]" />
                    </button>

                    <button class="btn btn-sm btn-outline-secondary" :title="$t('Edit')" @click="$emit('edit', line)">
                        <font-awesome-icon icon="pen" />
                    </button>

                    <button class="btn btn-sm btn-outline-danger" :title="$t('Delete')" @click="confirmDelete(line)">
                        <font-awesome-icon icon="trash" />
                    </button>
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
         * Lines are kept in the shared root state so the status page editor and
         * this list always agree.
         * @returns {object[]} Lines
         */
        lines() {
            return Array.isArray(this.$root.allLineStatusList) ? this.$root.allLineStatusList : [];
        },
    },
    mounted() {
        this.load();
    },
    methods: {
        /**
         * Ask the server for the current list.
         * @returns {void}
         */
        load() {
            this.$root.getSocket().emit("getLineStatusList", (res) => {
                this.loading = false;
                if (res.ok) {
                    this.$root.allLineStatusList = res.data;
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
    margin-bottom: 20px;

    .list-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(140, 140, 140, 0.15);
    }

    .list-title {
        margin: 0;
        font-size: 15px;
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .list-empty {
        padding: 24px 16px;
        text-align: center;
        opacity: 0.75;
        font-size: 14px;
    }

    .line-row {
        position: relative;
        padding: 4px 16px 8px;
        border-bottom: 1px solid rgba(140, 140, 140, 0.1);

        &:last-child {
            border-bottom: none;
        }
    }

    .line-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        padding-left: 12px;
        margin-top: -28px;
        justify-content: flex-end;
    }

    .line-error {
        font-size: 12px;
        color: #ef4444;
        margin-top: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
    }
}
</style>
