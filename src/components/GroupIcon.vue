<template>
    <svg
        class="group-icon"
        :width="size"
        :height="size"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        fill-rule="evenodd"
        role="img"
        :aria-label="definition.label"
        focusable="false"
    >
        <path
            v-for="(path, index) in definition.paths"
            :key="index"
            :d="path.d"
            :fill="path.fill || definition.color || 'currentColor'"
            :stroke="definition.strokeWidth ? 'currentColor' : 'none'"
            :stroke-width="definition.strokeWidth || 0"
            stroke-linejoin="round"
        />
    </svg>
</template>

<script>
import { getGroupIcon } from "../group-icons.js";

export default {
    name: "GroupIcon",
    props: {
        /** Icon key stored in monitor.icon */
        icon: {
            type: String,
            default: "other",
        },
        /** Rendered edge length in pixels */
        size: {
            type: Number,
            default: 18,
        },
    },
    computed: {
        definition() {
            return getGroupIcon(this.icon);
        },
    },
};
</script>

<style lang="scss" scoped>
.group-icon {
    display: inline-block;
    flex: none;
    vertical-align: middle;
}
</style>
