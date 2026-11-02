<template>
    <div class="group-manager container-fluid">
        <div class="page-header d-flex flex-wrap align-items-start justify-content-between gap-3">
            <div>
                <h1 class="mb-1">{{ $t("Group Management") }}</h1>
                <p class="text-muted mb-0">{{ $t("Manage monitor groups and their icons") }}</p>
            </div>
            <button type="button" class="btn btn-primary" @click="startCreate">
                <font-awesome-icon icon="plus" class="me-1" />
                {{ $t("New Group") }}
            </button>
        </div>

        <div v-if="creating" class="card create-panel mt-3">
            <div class="card-body">
                <h5 class="card-title">{{ $t("New Group") }}</h5>
                <div class="row g-3 align-items-end">
                    <div class="col-12 col-lg-5">
                        <label for="newGroupName" class="form-label">{{ $t("Group Name") }}</label>
                        <input
                            id="newGroupName"
                            v-model="createName"
                            type="text"
                            class="form-control"
                            :placeholder="$t('Group Name')"
                            @keyup.enter="createGroup"
                        />
                    </div>
                    <div class="col-12 col-lg-7">
                        <label class="form-label">{{ $t("Group Icon") }}</label>
                        <GroupIconPicker v-model="createIcon" />
                    </div>
                </div>
                <div class="d-flex gap-2 mt-3">
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="saving || !createName.trim()"
                        @click="createGroup"
                    >
                        {{ $t("Create") }}
                    </button>
                    <button type="button" class="btn btn-secondary" :disabled="saving" @click="creating = false">
                        {{ $t("Cancel") }}
                    </button>
                </div>
            </div>
        </div>

        <div class="row g-3 mt-1">
            <div class="col-12 col-lg-4">
                <div class="card group-list-card">
                    <div class="card-header d-flex align-items-center justify-content-between">
                        <span>{{ $t("Groups") }}</span>
                        <span class="badge text-bg-secondary">{{ groups.length }}</span>
                    </div>
                    <div v-if="groups.length === 0" class="card-body text-muted">
                        {{ $t("No groups yet") }}
                    </div>
                    <div v-else class="group-list">
                        <div
                            v-for="(group, index) in groups"
                            :key="group.id"
                            class="group-row"
                            :class="{ active: selectedGroup && selectedGroup.id === group.id }"
                        >
                            <button type="button" class="group-select" @click="selectGroup(group)">
                                <GroupIcon :icon="group.icon || 'other'" :size="26" />
                                <span class="group-row-main">
                                    <span class="group-row-name">{{ group.name }}</span>
                                    <span class="group-row-meta">{{ $t("Monitors", childCount(group)) }}</span>
                                </span>
                                <span class="badge" :class="group.active ? 'text-bg-success' : 'text-bg-secondary'">
                                    {{ group.active ? $t("Active") : $t("Inactive") }}
                                </span>
                            </button>
                            <div class="group-move">
                                <button
                                    type="button"
                                    class="btn btn-sm btn-link"
                                    :disabled="index === 0"
                                    :aria-label="$t('Move up')"
                                    @click="moveGroup(group, -1)"
                                >
                                    ↑
                                </button>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-link"
                                    :disabled="index === groups.length - 1"
                                    :aria-label="$t('Move down')"
                                    @click="moveGroup(group, 1)"
                                >
                                    ↓
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-12 col-lg-8">
                <div v-if="selectedGroup" class="card">
                    <div class="card-body">
                        <div class="d-flex align-items-center gap-3 mb-3">
                            <span class="icon-preview">
                                <GroupIcon :icon="editIcon || 'other'" :size="42" />
                            </span>
                            <div>
                                <h3 class="mb-1">{{ selectedGroup.name }}</h3>
                                <div class="text-muted">
                                    {{ $t("Monitors", childCount(selectedGroup)) }}
                                </div>
                            </div>
                        </div>

                        <div class="mb-3">
                            <label for="editGroupName" class="form-label">{{ $t("Group Name") }}</label>
                            <input
                                id="editGroupName"
                                v-model="editName"
                                type="text"
                                class="form-control"
                                :placeholder="$t('Group Name')"
                            />
                        </div>

                        <div class="mb-3">
                            <label class="form-label">{{ $t("Group Icon") }}</label>
                            <GroupIconPicker v-model="editIcon" />
                        </div>

                        <div class="d-flex flex-wrap gap-2">
                            <button
                                type="button"
                                class="btn btn-primary"
                                :disabled="saving || !editName.trim()"
                                @click="saveGroup"
                            >
                                {{ $t("Save") }}
                            </button>
                            <button type="button" class="btn btn-outline-danger" @click="confirmDelete">
                                {{ $t("Delete") }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="selectedGroup" class="card mt-3">
                    <div class="card-header">{{ $t("Monitors in this group") }}</div>
                    <div v-if="groupMonitors.length === 0" class="card-body text-muted">
                        {{ $t("No monitors in this group") }}
                    </div>
                    <div v-else class="monitor-list">
                        <div v-for="monitor in groupMonitors" :key="monitor.id" class="monitor-row">
                            <div class="monitor-main">
                                <GroupIcon v-if="monitor.type === 'group'" :icon="monitor.icon || 'other'" :size="20" />
                                <span class="monitor-name">{{ monitor.name }}</span>
                                <span v-if="!monitor.active" class="badge text-bg-secondary">{{ $t("Inactive") }}</span>
                            </div>
                            <button
                                type="button"
                                class="btn btn-sm btn-outline-secondary"
                                @click="removeMonitor(monitor)"
                            >
                                {{ $t("Remove") }}
                            </button>
                        </div>
                    </div>
                </div>

                <div v-if="selectedGroup" class="card mt-3">
                    <div class="card-header">{{ $t("Add monitors to this group") }}</div>
                    <div class="card-body">
                        <input
                            v-model="search"
                            type="search"
                            class="form-control mb-3"
                            :placeholder="$t('Search...')"
                            :aria-label="$t('Search...')"
                        />
                        <div v-if="availableMonitors.length === 0" class="text-muted">
                            {{ $t("No monitors available") }}
                        </div>
                        <div v-else class="monitor-list">
                            <div v-for="monitor in availableMonitors" :key="monitor.id" class="monitor-row">
                                <div class="monitor-main">
                                    <GroupIcon
                                        v-if="monitor.type === 'group'"
                                        :icon="monitor.icon || 'other'"
                                        :size="20"
                                    />
                                    <span class="monitor-name">{{ monitor.name }}</span>
                                    <span v-if="monitor.parent" class="monitor-current-group">
                                        {{ groupNameFor(monitor) }}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    class="btn btn-sm btn-outline-primary"
                                    @click="addMonitor(monitor)"
                                >
                                    {{ $t("Add") }}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div v-if="!selectedGroup" class="card">
                    <div class="card-body text-center text-muted py-5">
                        {{ $t("No groups yet") }}
                    </div>
                </div>
            </div>
        </div>

        <Confirm
            ref="confirmDelete"
            btn-style="btn-danger"
            :yes-text="$t('Delete')"
            :no-text="$t('Cancel')"
            @yes="deleteGroup"
        >
            {{ $t("Delete group confirm") }}
        </Confirm>
    </div>
</template>

<script>
import Confirm from "../components/Confirm.vue";
import GroupIcon from "../components/GroupIcon.vue";
import GroupIconPicker from "../components/GroupIconPicker.vue";

const GROUP_ICON_FALLBACK = "other";

export default {
    name: "ManageGroups",
    components: {
        Confirm,
        GroupIcon,
        GroupIconPicker,
    },
    data() {
        return {
            selectedGroupId: null,
            editName: "",
            editIcon: null,
            createName: "",
            createIcon: "openai",
            creating: false,
            saving: false,
            search: "",
            deleteTarget: null,
        };
    },
    computed: {
        groups() {
            return Object.values(this.$root.monitorList)
                .filter((monitor) => monitor.type === "group")
                .sort((a, b) => {
                    const weightDiff = (Number(b.weight) || 0) - (Number(a.weight) || 0);
                    return weightDiff || a.name.localeCompare(b.name);
                });
        },
        selectedGroup() {
            if (this.groups.length === 0) {
                return null;
            }
            return this.groups.find((group) => group.id === this.selectedGroupId) || this.groups[0];
        },
        groupMonitors() {
            if (!this.selectedGroup) {
                return [];
            }
            return Object.values(this.$root.monitorList)
                .filter((monitor) => monitor.parent === this.selectedGroup.id)
                .sort((a, b) => a.name.localeCompare(b.name));
        },
        availableMonitors() {
            if (!this.selectedGroup) {
                return [];
            }
            const query = this.search.trim().toLowerCase();
            return Object.values(this.$root.monitorList)
                .filter((monitor) => monitor.type !== "group" && monitor.parent !== this.selectedGroup.id)
                .filter((monitor) => !query || monitor.name.toLowerCase().includes(query))
                .sort((a, b) => {
                    const parentA = this.groupNameFor(a);
                    const parentB = this.groupNameFor(b);
                    return parentA.localeCompare(parentB) || a.name.localeCompare(b.name);
                });
        },
    },
    watch: {
        selectedGroup: {
            immediate: true,
            handler(group) {
                if (!group) {
                    return;
                }
                this.selectedGroupId = group.id;
                this.editName = group.name;
                this.editIcon = group.icon || null;
            },
        },
    },
    methods: {
        childCount(group) {
            return Object.values(this.$root.monitorList).filter((monitor) => monitor.parent === group.id).length;
        },
        groupNameFor(monitor) {
            const parent = this.$root.monitorList[monitor.parent];
            return parent ? parent.name : "";
        },
        selectGroup(group) {
            this.selectedGroupId = group.id;
        },
        startCreate() {
            this.creating = true;
            this.createName = "";
            this.createIcon = "openai";
        },
        nextWeight() {
            const maxWeight = this.groups.reduce((max, group) => Math.max(max, Number(group.weight) || 0), 0);
            return maxWeight + 1;
        },
        createGroup() {
            const name = this.createName.trim();
            if (!name || this.saving) {
                return;
            }

            this.saving = true;
            this.$root.add(
                {
                    type: "group",
                    name,
                    parent: null,
                    icon: this.createIcon || GROUP_ICON_FALLBACK,
                    interval: 60,
                    retryInterval: 60,
                    resendInterval: 0,
                    maxretries: 0,
                    active: true,
                    weight: this.nextWeight(),
                    notificationIDList: {},
                    accepted_statuscodes: ["200-299"],
                    conditions: [],
                    kafkaProducerBrokers: [],
                    kafkaProducerSaslOptions: { mechanism: "None" },
                    rabbitmqNodes: [],
                },
                (res) => {
                    this.saving = false;
                    if (!res || !res.ok) {
                        this.$root.toastError(res?.msg || "Failed to create group");
                        return;
                    }

                    this.selectedGroupId = res.monitorID;
                    this.creating = false;
                    this.createName = "";
                    this.$root.toastRes(res);
                }
            );
        },
        saveGroup() {
            const group = this.selectedGroup;
            const name = this.editName.trim();
            if (!group || !name || this.saving) {
                return;
            }

            const monitor = JSON.parse(JSON.stringify(group));
            monitor.name = name;
            monitor.icon = this.editIcon || null;
            this.saving = true;
            this.$root.getSocket().emit("editMonitor", monitor, (res) => {
                this.saving = false;
                if (!res || !res.ok) {
                    this.$root.toastError(res?.msg || "Failed to save group");
                    return;
                }
                this.$root.toastRes(res);
            });
        },
        confirmDelete() {
            if (!this.selectedGroup) {
                return;
            }
            this.deleteTarget = this.selectedGroup;
            this.$refs.confirmDelete.show();
        },
        deleteGroup() {
            const group = this.deleteTarget;
            this.deleteTarget = null;
            if (!group) {
                return;
            }

            this.$root.deleteMonitor(group.id, false, (res) => {
                if (!res || !res.ok) {
                    this.$root.toastError(res?.msg || "Failed to delete group");
                    return;
                }
                this.selectedGroupId = null;
                this.$root.toastRes(res);
            });
        },
        addMonitor(monitor) {
            this.setMonitorParent(monitor, this.selectedGroup.id);
        },
        removeMonitor(monitor) {
            this.setMonitorParent(monitor, null);
        },
        setMonitorParent(monitor, parent) {
            const updated = JSON.parse(JSON.stringify(monitor));
            updated.parent = parent;
            this.$root.getSocket().emit("editMonitor", updated, (res) => {
                if (!res || !res.ok) {
                    this.$root.toastError(res?.msg || "Failed to move monitor");
                }
            });
        },
        moveGroup(group, direction) {
            const ordered = [...this.groups];
            const index = ordered.findIndex((item) => item.id === group.id);
            const targetIndex = index + direction;
            if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) {
                return;
            }

            ordered.splice(index, 1);
            ordered.splice(targetIndex, 0, group);
            const baseWeight = ordered.length + 10;
            ordered.forEach((item, position) => {
                const monitor = JSON.parse(JSON.stringify(item));
                monitor.weight = baseWeight - position;
                this.$root.getSocket().emit("editMonitor", monitor, () => {});
            });
        },
    },
};
</script>

<style lang="scss" scoped>
.group-manager {
    max-width: 1200px;
    padding-bottom: 3rem;
}

.page-header {
    padding-top: 0.5rem;
}

.create-panel {
    border-left: 3px solid var(--bs-primary);
}

.group-list-card {
    overflow: hidden;
}

.group-list {
    display: flex;
    flex-direction: column;
}

.group-row {
    display: flex;
    align-items: stretch;
    border-top: 1px solid var(--bs-border-color);

    &:first-child {
        border-top: 0;
    }

    &.active {
        background: var(--bs-tertiary-bg);
        box-shadow: inset 3px 0 0 var(--bs-primary);
    }
}

.group-select {
    display: flex;
    flex: 1;
    align-items: center;
    gap: 0.65rem;
    min-width: 0;
    padding: 0.75rem;
    border: 0;
    background: transparent;
    color: inherit;
    text-align: left;
}

.group-row-main {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-width: 0;
}

.group-row-name {
    overflow: hidden;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-row-meta {
    color: var(--bs-secondary-color);
    font-size: 0.78rem;
}

.group-move {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-right: 0.35rem;

    .btn {
        padding: 0 0.35rem;
        line-height: 1;
        text-decoration: none;
    }
}

.icon-preview {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    border: 1px solid var(--bs-border-color);
    border-radius: 0.75rem;
    background: var(--bs-tertiary-bg);
}

.monitor-list {
    display: flex;
    flex-direction: column;
}

.monitor-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.55rem 1rem;
    border-top: 1px solid var(--bs-border-color);

    &:first-child {
        border-top: 0;
    }
}

.monitor-main {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
}

.monitor-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.monitor-current-group {
    color: var(--bs-secondary-color);
    font-size: 0.78rem;
    white-space: nowrap;
}
</style>
