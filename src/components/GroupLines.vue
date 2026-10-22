<template>
    <div class="line-status-box" :class="{ 'line-status-box--edit': editMode }">
        <!-- Existing lines -->
        <div v-if="lines.length > 0" class="line-status-block">
            <div v-for="line in lines" :key="'line-' + line.id" class="line-row">
                <font-awesome-icon
                    v-if="editMode"
                    icon="times"
                    class="action remove me-2"
                    :title="$t('Remove')"
                    @click="$emit('remove', Number(line.id))"
                />
                <LineStatusBar :line="line" />
            </div>
        </div>

        <!-- Empty hint in edit mode -->
        <div v-else-if="editMode" class="line-status-empty">
            {{ $t("No lines in this group yet.") }}
        </div>

        <!-- Picker -->
        <div v-if="editMode" class="add-line-row">
            <select v-if="options.length > 0" class="form-select form-select-sm" :value="''" @change="onPick">
                <option value="">{{ $t("Add a line to this group...") }}</option>
                <option v-for="opt in options" :key="opt.id" :value="opt.id">
                    {{ opt.displayName || opt.name }}
                </option>
            </select>
            <small v-else class="text-muted">{{ $t("No line status configured yet.") }}</small>
        </div>
    </div>
</template>

<script>
import LineStatusBar from "./LineStatusBar.vue";

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
    components: {
        LineStatusBar,
    },
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
.line-status-box {
    padding: 4px 0;
}

.line-status-block {
    padding: 4px 12px;

    .line-row + .line-row {
        border-top: 1px solid rgba(140, 140, 140, 0.1);
    }
}

.line-status-empty {
    padding: 12px;
    font-size: 13px;
    opacity: 0.6;
}

.add-line-row {
    padding: 10px 12px;
    border-top: 1px solid rgba(140, 140, 140, 0.1);
}
</style>
