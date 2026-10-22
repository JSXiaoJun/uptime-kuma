<template>
    <form @submit.prevent="submit">
        <div ref="modal" class="modal fade" tabindex="-1" data-bs-backdrop="static">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            {{ isEdit ? $t("Edit Line") : $t("Add Line") }}
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" :aria-label="$t('Close')" />
                    </div>

                    <div class="modal-body">
                        <div class="mb-3">
                            <label for="line-name" class="form-label">
                                {{ $t("Line name") }}
                                <span class="text-danger">*</span>
                            </label>
                            <input
                                id="line-name"
                                v-model="form.name"
                                type="text"
                                class="form-control"
                                :placeholder="$t('e.g. hk1')"
                                required
                                maxlength="255"
                            />
                            <div class="form-text">{{ $t("Short identifier shown before the percentage.") }}</div>
                        </div>

                        <div class="mb-3">
                            <label for="line-display-name" class="form-label">{{ $t("Display name") }}</label>
                            <input
                                id="line-display-name"
                                v-model="form.displayName"
                                type="text"
                                class="form-control"
                                :placeholder="$t('e.g. Hong Kong CN2')"
                                maxlength="255"
                            />
                            <div class="form-text">{{ $t("Optional. Falls back to the line name.") }}</div>
                        </div>

                        <div class="mb-3">
                            <label for="line-endpoint" class="form-label">
                                {{ $t("Status endpoint") }}
                                <span class="text-danger">*</span>
                            </label>
                            <input
                                id="line-endpoint"
                                v-model="form.endpoint"
                                type="url"
                                class="form-control"
                                placeholder="https://hk1.example.com/status.json"
                                required
                            />
                            <div class="form-text">
                                {{ $t("Must return JSON with usage_percent (0-100). See the status-generator example.") }}
                            </div>
                        </div>

                        <div class="row">
                            <div class="col-md-6 mb-3">
                                <label for="line-interval" class="form-label">{{ $t("Sample interval (seconds)") }}</label>
                                <input
                                    id="line-interval"
                                    v-model.number="form.intervalSeconds"
                                    type="number"
                                    class="form-control"
                                    min="60"
                                    max="86400"
                                    step="30"
                                />
                                <div class="form-text">{{ $t("Minimum 60 seconds.") }}</div>
                            </div>

                            <div class="col-md-6 mb-3">
                                <label for="line-capacity" class="form-label">{{ $t("Capacity (Mbps)") }}</label>
                                <input
                                    id="line-capacity"
                                    v-model.number="form.capacityMbps"
                                    type="number"
                                    class="form-control"
                                    min="1"
                                    max="100000"
                                    step="1"
                                />
                                <div class="form-text">{{ $t("Used for reference only; the endpoint reports the percentage.") }}</div>
                            </div>
                        </div>

                        <div class="form-check mb-2">
                            <input id="line-enabled" v-model="form.enabled" class="form-check-input" type="checkbox" />
                            <label class="form-check-label" for="line-enabled">{{ $t("Enabled") }}</label>
                        </div>

                        <div v-if="errorMsg" class="alert alert-danger py-2 mt-3 mb-0">
                            {{ errorMsg }}
                        </div>
                    </div>

                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">
                            {{ $t("Cancel") }}
                        </button>
                        <button type="submit" class="btn btn-primary" :disabled="processing">
                            {{ $t("Save") }}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </form>
</template>

<script>
import { Modal } from "bootstrap";
import { useToast } from "vue-toastification";

/**
 * Empty form state used when adding a new line.
 * @returns {object} Default form values
 */
function emptyForm() {
    return {
        id: null,
        name: "",
        displayName: "",
        endpoint: "",
        intervalSeconds: 300,
        capacityMbps: 80,
        enabled: true,
    };
}

export default {
    name: "LineStatusDialog",
    data() {
        return {
            modal: null,
            form: emptyForm(),
            processing: false,
            errorMsg: "",
            toast: useToast(),
        };
    },
    computed: {
        isEdit() {
            return this.form.id !== null;
        },
    },
    mounted() {
        this.modal = new Modal(this.$refs.modal);
    },
    unmounted() {
        this.modal?.dispose();
    },
    methods: {
        /**
         * Open the dialog in add mode.
         * @returns {void}
         */
        show() {
            this.form = emptyForm();
            this.errorMsg = "";
            this.modal.show();
        },
        /**
         * Open the dialog in edit mode.
         * @param {object} line Existing line
         * @returns {void}
         */
        showEdit(line) {
            this.form = {
                id: line.id,
                name: line.name ?? "",
                displayName: line.displayName ?? "",
                endpoint: line.endpoint ?? "",
                intervalSeconds: line.intervalSeconds ?? 300,
                capacityMbps: line.capacityMbps ?? 80,
                enabled: line.enabled !== false,
            };
            this.errorMsg = "";
            this.modal.show();
        },
        /**
         * Persist the line to the server.
         * @returns {void}
         */
        submit() {
            if (this.processing) {
                return;
            }
            this.errorMsg = "";
            this.processing = true;

            const payload = {
                name: this.form.name.trim(),
                displayName: this.form.displayName.trim(),
                endpoint: this.form.endpoint.trim(),
                intervalSeconds: Number(this.form.intervalSeconds) || 300,
                capacityMbps: Number(this.form.capacityMbps) || 80,
                enabled: this.form.enabled,
            };

            const event = this.isEdit ? "editLineStatus" : "addLineStatus";
            const args = this.isEdit ? [this.form.id, payload] : [payload];

            this.$root.socket.emit(event, ...args, (res) => {
                this.processing = false;
                if (res.ok) {
                    this.toast.success(this.isEdit ? this.$t("Saved.") : this.$t("successAdded"));
                    this.modal.hide();
                } else {
                    this.errorMsg = res.msg || "Unknown error";
                }
            });
        },
    },
};
</script>
