<template>
    <div class="container-fluid">
        <div class="row">
            <div v-if="!$root.isMobile" class="col-12 col-md-5 col-xl-4 ps-0">
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
                <MonitorList :scrollbar="true" />

                <LineStatusList ref="lineList" @add="$refs.lineDialog.show()" @edit="onEditLine" />
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
</style>
