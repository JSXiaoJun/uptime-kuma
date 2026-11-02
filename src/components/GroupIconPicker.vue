<template>
    <div class="group-icon-picker" role="group" :aria-label="$t('Group Icon')">
        <button
            v-if="allowNone"
            type="button"
            class="icon-option"
            :class="{ active: !modelValue }"
            :aria-pressed="!modelValue"
            @click="select(null)"
        >
            <span class="none-mark">—</span>
            <span>{{ $t("No icon") }}</span>
        </button>

        <button
            v-for="key in keys"
            :key="key"
            type="button"
            class="icon-option"
            :class="{ active: modelValue === key }"
            :aria-pressed="modelValue === key"
            :title="label(key)"
            @click="select(key)"
        >
            <GroupIcon :icon="key" :size="22" />
            <span>{{ label(key) }}</span>
        </button>
    </div>
</template>

<script>
import GroupIcon from "./GroupIcon.vue";
import { GROUP_ICON_KEYS, getGroupIconLabel } from "../group-icons.js";

export default {
    name: "GroupIconPicker",
    components: {
        GroupIcon,
    },
    props: {
        modelValue: {
            type: String,
            default: null,
        },
        /** Allow clearing the icon */
        allowNone: {
            type: Boolean,
            default: true,
        },
    },
    emits: ["update:modelValue"],
    computed: {
        keys() {
            return GROUP_ICON_KEYS;
        },
    },
    methods: {
        label(key) {
            return getGroupIconLabel(key);
        },
        select(key) {
            this.$emit("update:modelValue", key);
        },
    },
};
</script>

<style lang="scss" scoped>
.group-icon-picker {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.icon-option {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 40px;
    padding: 0.35rem 0.65rem;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.5rem;
    background: var(--bs-body-bg);
    color: var(--bs-body-color);
    font-size: 0.85rem;
    line-height: 1.1;

    &:hover {
        border-color: var(--bs-primary);
    }

    &.active {
        border-color: var(--bs-primary);
        box-shadow: 0 0 0 1px var(--bs-primary);
    }
}

.none-mark {
    width: 22px;
    text-align: center;
    opacity: 0.6;
}
</style>
