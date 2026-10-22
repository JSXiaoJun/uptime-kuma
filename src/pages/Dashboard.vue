<template>
    <div class="container-fluid">
        <div class="row">
            <div v-if="!$root.isMobile" class="col-12 col-md-5 col-xl-4 ps-0 sidebar">
                <div class="d-flex gap-2 flex-wrap mb-3">
                    <router-link to="/add" class="btn btn-primary">
                        <font-awesome-icon icon="plus" />
                        {{ $t("Add New Monitor") }}
                    </router-link>

                    <button class="btn btn-outline-primary" @click="$refs.lineDialog.show()">
                        <font-awesome-icon icon="network-wired" />
                        {{ $t("Add Line") }}
                    </button>
                </div>

                <!--
                    The monitor list sizes itself with `calc(100vh - 160px)`,
                    which fills the viewport and pushes anything after it out of
                    view (the line cards ended up scrolled inside the monitor
                    list). Wrapping the list in a flex child that can shrink
                    keeps both blocks visible.
                -->
                <div class="sidebar-stack">
                    <div class="monitor-slot">
                        <MonitorList :scrollbar="true" class="sidebar-monitor-box" />
                    </div>

                    <!--
                        Shown as soon as the list request was attempted (even if
                        it failed), so the empty state and the "Add Line" entry
                        inside it stay reachable.
                    -->
                    <div v-if="linesLoaded" class="line-slot">
                        <LineStatusList ref="lineList" @add="$refs.lineDialog.show()" @edit="onEditLine" />
                    </div>
                </div>
            </div>

            <div ref="container" class="col-12 col-md-7 col-xl-8 mb-3 gx-0">
                <!-- Add :key to disable vue router re-use the same component -->
                <router-view :key="$route.fullPath" :calculatedHeight="height" />
            </div>
        </div>

        <LineStatusDialog ref="lineDialog" />
    </div>
</template>

<script>
import MonitorList from "../components/MonitorList.vue";
import LineStatusList from "../components/LineStatusList.vue";
import LineStatusDialog from "../components/LineStatusDialog.vue";

export default {
    components: {
        MonitorList,
        LineStatusList,
        LineStatusDialog,
    },
    data() {
        return {
            height: 0,
            // The line block used to be rendered only when the list was
            // already populated, but LineStatusList is the component that
            // fetches the list, so it never got a chance to load. Show it once
            // the request has been attempted instead.
            linesLoaded: false,
        };
    },
    computed: {
        /**
         * Lines from the admin catalogue, used to decide whether the sidebar
         * line block should be rendered at all.
         *
         * This deliberately reads `lineStatusList` and not the status-page
         * `allLineStatusList`: the two payloads are shaped differently (admin
         * rows carry `lastUsagePercent`/`endpoint`, status page rows carry
         * `usagePercent`/`updatedAt`), and sharing one field made the admin
         * block render status page data with an empty timestamp.
         * @returns {object[]} Lines
         */
        lines() {
            return Array.isArray(this.$root.lineStatusList) ? this.$root.lineStatusList : [];
        },
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
    created() {
        // created() runs after the socket mixin's own created() hook, but the
        // connection and the login are asynchronous. The server pushes
        // `lineStatusList` right after authentication, so listen for it and
        // also ask explicitly in case that push has already happened.
        this.$root.emitter.on("lineStatusList", this.onLineStatusList);
        this.fetchLines();
    },
    beforeUnmount() {
        clearTimeout(this.fetchLinesRetry);
        this.$root.emitter.off("lineStatusList", this.onLineStatusList);
    },
    methods: {
        /**
         * Mark the line block as ready once the server pushed the list.
         * @returns {void}
         */
        onLineStatusList() {
            this.linesLoaded = true;
        },
        /**
         * Ask the server for the line catalogue.
         *
         * The list used to be requested only by LineStatusList's mount hook,
         * but that component is rendered behind a `v-if` that depended on the
         * list being non-empty, so on a fresh page load nothing ever asked and
         * the block stayed hidden.
         * @returns {void}
         */
        fetchLines() {
            // The socket mixin already pulled the list after login.
            if (this.$root.lineStatusListLoaded) {
                this.linesLoaded = true;
            }
            const socket = this.$root.getSocket();
            if (!socket || !socket.connected) {
                // Retry until the socket and the login are ready.
                clearTimeout(this.fetchLinesRetry);
                this.fetchLinesRetry = setTimeout(() => this.fetchLines(), 500);
                return;
            }
            socket.emit("getLineStatusList", (res) => {
                if (res.ok) {
                    // Stored locally only; `$root.lineStatusList` is kept in
                    // sync by the socket "lineStatusList" event.
                    this.$root.lineStatusList = res.data;
                }
                // Render the block even when the request failed, so the
                // loading/error state and the "Add Line" entry stay reachable.
                this.linesLoaded = true;
            });
        },
        /**
         * Open the dialog pre-filled with an existing line.
         * @param {object} line Line to edit
         * @returns {void}
         */
        onEditLine(line) {
            this.$refs.lineDialog.showEdit(line);
        },
    },
};
</script>

<style lang="scss" scoped>
.container-fluid {
    width: 98%;
}

.sidebar {
    display: flex;
    flex-direction: column;
    max-height: calc(100vh - 100px);
}

.sidebar-stack {
    display: flex;
    flex-direction: column;
    min-height: 0;
    gap: 12px;
}

.monitor-slot {
    flex: 1 1 auto;
    min-height: 0;
    overflow: hidden;
}

.line-slot {
    flex: 0 0 auto;
    max-height: 45%;
    overflow-y: auto;
}
</style>

<!--
    MonitorList sizes its root box with calc(100vh - 160px), which fills the
    viewport and pushes the line cards out of view. The class below is merged
    onto that root element and constrained here (a plain global rule avoids the
    ::v-deep / :deep syntax that this project's stylelint config rejects).
-->
<style lang="scss">
.monitor-slot .sidebar-monitor-box {
    height: 100% !important;
    margin-bottom: 0 !important;
}
</style>
