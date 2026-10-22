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

                    <div v-if="lines.length > 0" class="line-slot">
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
        };
    },
    computed: {
        /**
         * Lines from the shared catalogue, used to decide whether the sidebar
         * line block should be rendered at all.
         * @returns {object[]} Lines
         */
        lines() {
            return Array.isArray(this.$root.allLineStatusList) ? this.$root.allLineStatusList : [];
        },
    },
    mounted() {
        this.height = this.$refs.container.offsetHeight;
    },
    methods: {
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
