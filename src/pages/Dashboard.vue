<template>
    <div class="container-fluid">
        <div class="row">
            <div v-if="!$root.isMobile" class="col-12 col-md-5 col-xl-4 ps-0">
                <div class="sidebar-header mb-3">
                    <div class="sidebar-tabs" role="tablist">
                        <button
                            id="sidebar-tab-monitors"
                            type="button"
                            role="tab"
                            class="sidebar-tab"
                            :class="{ active: tab === 'monitors' }"
                            :aria-selected="tab === 'monitors'"
                            aria-controls="sidebar-panel-monitors"
                            @click="tab = 'monitors'"
                        >
                            {{ $t("Monitors tab") }}
                            <span class="tab-count">{{ monitorCount }}</span>
                        </button>
                        <button
                            id="sidebar-tab-lines"
                            type="button"
                            role="tab"
                            class="sidebar-tab"
                            :class="{ active: tab === 'lines' }"
                            :aria-selected="tab === 'lines'"
                            aria-controls="sidebar-panel-lines"
                            @click="tab = 'lines'"
                        >
                            {{ $t("Lines tab") }}
                            <span class="tab-count">{{ lines.length }}</span>
                        </button>
                    </div>

                    <router-link v-if="tab === 'monitors'" to="/add" class="btn btn-primary">
                        <font-awesome-icon icon="plus" />
                        {{ $t("Add New Monitor") }}
                    </router-link>
                    <button v-else type="button" class="btn btn-primary" @click="$refs.lineDialog.show()">
                        <font-awesome-icon icon="plus" />
                        {{ $t("Add Line") }}
                    </button>
                </div>

                <!-- v-show keeps the monitor list's search and filters when switching tabs -->
                <div
                    v-show="tab === 'monitors'"
                    id="sidebar-panel-monitors"
                    class="sidebar-panel"
                    role="tabpanel"
                    aria-labelledby="sidebar-tab-monitors"
                >
                    <MonitorList :scrollbar="true" />
                </div>

                <div
                    v-if="tab === 'lines'"
                    id="sidebar-panel-lines"
                    class="sidebar-panel"
                    role="tabpanel"
                    aria-labelledby="sidebar-tab-lines"
                >
                    <LineStatusList class="line-tab-box" @add="$refs.lineDialog.show()" @edit="onEditLine" />
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
            tab: "monitors",
        };
    },
    computed: {
        /**
         * Top-level monitors, matching what the monitor list shows.
         * @returns {number} Monitor count
         */
        monitorCount() {
            return Object.values(this.$root.monitorList).filter((monitor) => monitor.parent === null).length;
        },
        /**
         * Lines from the admin catalogue. The socket mixin fetches it after
         * login and keeps it in sync through the "lineStatusList" event.
         * @returns {object[]} Lines
         */
        lines() {
            return Array.isArray(this.$root.lineStatusList) ? this.$root.lineStatusList : [];
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
@import "../assets/vars.scss";

.container-fluid {
    width: 98%;
}

.sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.sidebar-tabs {
    display: inline-flex;
    padding: 3px;
    border-radius: 50rem;
    background-color: rgba(140, 140, 140, 0.12);

    .dark & {
        background-color: $dark-header-bg;
    }
}

.sidebar-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 16px;
    border: 0;
    border-radius: 50rem;
    background: transparent;
    color: inherit;
    font-size: 0.95em;
    white-space: nowrap;
    transition: all ease-in-out 0.15s;

    &:hover {
        color: $primary;
    }

    &.active {
        background-color: #fff;
        color: $dark-font-color2;
        box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);

        .dark & {
            background-color: $dark-bg2;
            color: $dark-font-color;
        }
    }

    &:focus-visible {
        outline: 2px solid $primary;
        outline-offset: 1px;
    }
}

.tab-count {
    min-width: 22px;
    padding: 0 6px;
    border-radius: 50rem;
    background-color: rgba(140, 140, 140, 0.2);
    font-size: 0.8em;
    line-height: 1.6;
    text-align: center;

    .active & {
        background-color: $primary;
        color: $dark-font-color2;
    }
}

/* The list boxes are position: sticky and need the full-height column as their containing block */
.sidebar-panel {
    display: contents;
}

/* Same size and stickiness as the monitor list box */
.line-tab-box {
    height: calc(100vh - 160px);
    position: sticky;
    top: 10px;
    margin-bottom: 1rem;
}
</style>
