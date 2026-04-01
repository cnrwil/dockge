<template>
    <transition name="slide-fade" appear>
        <div>
            <h1 v-if="isAdd" class="mb-3">{{ $t("compose") }}</h1>
            <h1 v-else class="mb-3">
                <Uptime :stack="globalStack" :pill="true" /> {{ stack.name }}
                <span v-if="$root.agentCount > 1" class="agent-name">
                    ({{ endpointDisplay }})
                </span>
            </h1>

            <div v-if="stack.isManagedByDockge" class="mb-3">
                <div class="btn-group me-2" role="group">
                    <button v-if="isEditMode" class="btn btn-primary" :disabled="processing" @click="deployStack">
                        <font-awesome-icon icon="rocket" class="me-1" />
                        {{ $t("deployStack") }}
                    </button>

                    <button v-if="isEditMode" class="btn btn-normal" :disabled="processing" @click="saveStack">
                        <font-awesome-icon icon="save" class="me-1" />
                        {{ $t("saveStackDraft") }}
                    </button>

                    <button v-if="!isEditMode" class="btn btn-secondary" :disabled="processing" @click="enableEditMode">
                        <font-awesome-icon icon="pen" class="me-1" />
                        {{ $t("editStack") }}
                    </button>

                    <button v-if="!isEditMode && !active" class="btn btn-primary" :disabled="processing" @click="startStack">
                        <font-awesome-icon icon="play" class="me-1" />
                        {{ $t("startStack") }}
                    </button>

                    <button v-if="!isEditMode && active" class="btn btn-normal" :disabled="processing" @click="restartStack">
                        <font-awesome-icon icon="rotate" class="me-1" />
                        {{ $t("restartStack") }}
                    </button>

                    <button v-if="!isEditMode" class="btn btn-normal" :disabled="processing" @click="updateStack">
                        <font-awesome-icon icon="cloud-arrow-down" class="me-1" />
                        {{ $t("updateStack") }}
                    </button>

                    <button v-if="!isEditMode && active" class="btn btn-normal" :disabled="processing" @click="stopStack">
                        <font-awesome-icon icon="stop" class="me-1" />
                        {{ $t("stopStack") }}
                    </button>

                    <BDropdown right text="" variant="normal">
                        <BDropdownItem @click="downStack">
                            <font-awesome-icon icon="stop" class="me-1" />
                            {{ $t("downStack") }}
                        </BDropdownItem>
                    </BDropdown>
                </div>

                <button v-if="isEditMode && !isAdd" class="btn btn-normal" :disabled="processing" @click="discardStack">{{ $t("discardStack") }}</button>
                <button v-if="!isEditMode" class="btn btn-danger" :disabled="processing" @click="showDeleteDialog = !showDeleteDialog">
                    <font-awesome-icon icon="trash" class="me-1" />
                    {{ $t("deleteStack") }}
                </button>
            </div>

            <!-- URLs -->
            <div v-if="urls.length > 0" class="mb-3">
                <a v-for="(url, index) in urls" :key="index" target="_blank" :href="url.url">
                    <span class="badge bg-secondary me-2">{{ url.display }}</span>
                </a>
            </div>

            <!-- Progress Terminal -->
            <transition name="slide-fade" appear>
                <Terminal
                    v-show="showProgressTerminal"
                    ref="progressTerminal"
                    class="mb-3 terminal"
                    :name="terminalName"
                    :endpoint="endpoint"
                    :rows="progressTerminalRows"
                    @has-data="showProgressTerminal = true; submitted = true;"
                ></Terminal>
            </transition>

            <div v-if="stack.isManagedByDockge" class="row">
                <div class="col-lg-6">
                    <!-- General -->
                    <div v-if="isAdd">
                        <h4 class="mb-3">{{ $t("general") }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <div>
                                <label for="name" class="form-label">{{ $t("stackName") }}</label>
                                <input id="name" v-model="stack.name" type="text" class="form-control" required @blur="stackNameToLowercase">
                                <div class="form-text">{{ $t("Lowercase only") }}</div>
                            </div>
                            <div class="mt-3">
                                <label for="name" class="form-label">{{ $t("dockgeAgent") }}</label>
                                <select v-model="stack.endpoint" class="form-select">
                                    <option v-for="(agent, endpoint) in $root.agentList" :key="endpoint" :value="endpoint" :disabled="$root.agentStatusList[endpoint] != 'online'">
                                        ({{ $root.agentStatusList[endpoint] }}) {{ (endpoint) ? endpoint : $t("currentEndpoint") }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Containers -->
                    <h4 class="mb-3">{{ $tc("container", 2) }}</h4>

                    <div v-if="isEditMode" class="input-group mb-3">
                        <input
                            v-model="newContainerName"
                            :placeholder="$t(`New Container Name...`)"
                            class="form-control"
                            @keyup.enter="addContainer"
                        />
                        <button class="btn btn-primary" @click="addContainer">
                            {{ $t("addContainer") }}
                        </button>
                    </div>

                    <div ref="containerList">
                        <Container
                            v-for="(service, name) in jsonConfig.services"
                            :key="name"
                            :name="name"
                            :is-edit-mode="isEditMode"
                            :first="name === Object.keys(jsonConfig.services)[0]"
                            :status="serviceStatusList[name]?.state"
                            :ports="serviceStatusList[name]?.ports"
                        />
                    </div>

                    <!-- Extra (URLs) -->
                    <div v-if="isEditMode">
                        <h4 class="mb-3">{{ $t("extra") }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <div class="mb-4">
                                <label class="form-label">{{ $tc("url", 2) }}</label>
                                <ArrayInput name="urls" :display-name="$t('url')" placeholder="https://" object-type="x-dockge" />
                            </div>
                        </div>
                    </div>

                    <!-- Combined Terminal Output -->
                    <div v-show="!isEditMode">
                        <h4 class="mb-3">{{ $t("terminal") }}</h4>
                        <Terminal
                            ref="combinedTerminal"
                            class="mb-3 terminal"
                            :name="combinedTerminalName"
                            :endpoint="endpoint"
                            :rows="combinedTerminalRows"
                            :cols="combinedTerminalCols"
                            style="height: 315px;"
                        ></Terminal>
                    </div>

                    <!-- ======================== -->
                    <!-- NEW FEATURE PANELS       -->
                    <!-- ======================== -->
                    <div v-if="!isAdd">

                        <!-- Resource Usage -->
                        <div v-if="!isEditMode" class="shadow-box big-padding mb-3">
                            <h5 class="mb-3"><font-awesome-icon icon="microchip" class="me-2" />Resource Usage</h5>
                            <StackResourceUsage :stack-name="stack.name" />
                        </div>

                        <!-- Tags -->
                        <div class="shadow-box big-padding mb-3">
                            <h5 class="mb-3"><font-awesome-icon icon="tags" class="me-2" />Tags</h5>
                            <StackTags :stack-name="stack.name" :editable="true" />
                        </div>

                        <!-- Dependencies -->
                        <div class="shadow-box big-padding mb-3">
                            <StackDependencies
                                :stack-name="stack.name"
                                :all-stacks="Object.keys($root.stackList)"
                            />
                        </div>

                        <!-- Scheduled Tasks -->
                        <div class="shadow-box big-padding mb-3">
                            <ScheduledTasks :stack-name="stack.name" />
                        </div>

                        <!-- Backup & Export -->
                        <div class="shadow-box big-padding mb-3">
                            <StackBackup :stack-name="stack.name" />
                        </div>

                    </div>
                </div>

                <div class="col-lg-6">
                    <h4 class="mb-3">{{ stack.composeFileName }}</h4>

                    <!-- Compose Validation Banner (edit mode only) -->
                    <ComposeValidationBanner v-if="isEditMode" :compose-yaml="stack.composeYAML" class="mb-2" />

                    <!-- Diff View (edit mode, existing stack only) -->
                    <ComposeDiff
                        v-if="isEditMode && !isAdd && originalYAML"
                        :old-yaml="originalYAML"
                        :new-yaml="stack.composeYAML"
                        class="mb-3"
                        @close="originalYAML = null"
                    />

                    <!-- YAML editor -->
                    <div class="shadow-box mb-3 editor-box" :class="{'edit-mode' : isEditMode}">
                        <code-mirror
                            ref="editor"
                            v-model="stack.composeYAML"
                            :extensions="extensions"
                            minimal
                            wrap="true"
                            dark="true"
                            tab="true"
                            :disabled="!isEditMode"
                            :hasFocus="editorFocus"
                            @change="yamlCodeChange"
                        />
                    </div>
                    <div v-if="isEditMode" class="mb-3">
                        {{ yamlError }}
                    </div>

                    <!-- ENV editor -->
                    <div v-if="isEditMode">
                        <h4 class="mb-3">.env</h4>
                        <div class="shadow-box mb-3 editor-box" :class="{'edit-mode' : isEditMode}">
                            <code-mirror
                                ref="editor"
                                v-model="stack.composeENV"
                                :extensions="extensionsEnv"
                                minimal
                                wrap="true"
                                dark="true"
                                tab="true"
                                :disabled="!isEditMode"
                                :hasFocus="editorFocus"
                                @change="yamlCodeChange"
                            />
                        </div>
                    </div>

                    <div v-if="isEditMode">
                        <!-- Networks -->
                        <h4 class="mb-3">{{ $tc("network", 2) }}</h4>
                        <div class="shadow-box big-padding mb-3">
                            <NetworkInput />
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="!stack.isManagedByDockge && !processing">
                {{ $t("stackNotManagedByDockgeMsg") }}
            </div>

            <!-- Delete Dialog -->
            <BModal v-model="showDeleteDialog" :cancelTitle="$t('cancel')" :okTitle="$t('deleteStack')" okVariant="danger" @ok="deleteDialog">
                {{ $t("deleteStackMsg") }}
            </BModal>
        </div>
    </transition>
</template>

<script>
import CodeMirror from "vue-codemirror6";
import { yaml } from "@codemirror/lang-yaml";
import { python } from "@codemirror/lang-python";
import { dracula as editorTheme } from "thememirror";
import { lineNumbers, EditorView } from "@codemirror/view";
import { parseDocument, Document } from "yaml";

import { FontAwesomeIcon } from "@fortawesome/vue-fontawesome";
import {
    COMBINED_TERMINAL_COLS,
    COMBINED_TERMINAL_ROWS,
    copyYAMLComments, envsubstYAML,
    getCombinedTerminalName,
    getComposeTerminalName,
    PROGRESS_TERMINAL_ROWS,
    RUNNING
} from "../../../common/util-common";
import { BModal } from "bootstrap-vue-next";
import NetworkInput from "../components/NetworkInput.vue";
import StackTags from "../components/StackTags.vue";
import StackDependencies from "../components/StackDependencies.vue";
import ScheduledTasks from "../components/ScheduledTasks.vue";
import StackBackup from "../components/StackBackup.vue";
import StackResourceUsage from "../components/StackResourceUsage.vue";
import ComposeValidationBanner from "../components/ComposeValidationBanner.vue";
import ComposeDiff from "../components/ComposeDiff.vue";
import dotenv from "dotenv";
import { ref } from "vue";

const template = `
services:
  nginx:
    image: nginx:latest
    restart: unless-stopped
    ports:
      - "8080:80"
`;
const envDefault = "# VARIABLE=value #comment";

let yamlErrorTimeout = null;
let serviceStatusTimeout = null;

export default {
    components: {
        NetworkInput,
        FontAwesomeIcon,
        CodeMirror,
        BModal,
        StackTags,
        StackDependencies,
        ScheduledTasks,
        StackBackup,
        StackResourceUsage,
        ComposeValidationBanner,
        ComposeDiff,
    },
    beforeRouteUpdate(to, from, next) {
        this.exitConfirm(next);
    },
    beforeRouteLeave(to, from, next) {
        this.exitConfirm(next);
    },
    setup() {
        const editorFocus = ref(false);
        const focusEffectHandler = (state, focusing) => {
            editorFocus.value = focusing;
            return null;
        };
        const extensions = [
            editorTheme,
            yaml(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];
        const extensionsEnv = [
            editorTheme,
            python(),
            lineNumbers(),
            EditorView.focusChangeEffect.of(focusEffectHandler)
        ];
        return { extensions, extensionsEnv, editorFocus };
    },
    yamlDoc: null,
    data() {
        return {
            jsonConfig: {},
            envsubstJSONConfig: {},
            yamlError: "",
            processing: true,
            showProgressTerminal: false,
            progressTerminalRows: PROGRESS_TERMINAL_ROWS,
            combinedTerminalRows: COMBINED_TERMINAL_ROWS,
            combinedTerminalCols: COMBINED_TERMINAL_COLS,
            stack: {},
            serviceStatusList: {},
            isEditMode: false,
            submitted: false,
            showDeleteDialog: false,
            newContainerName: "",
            stopServiceStatusTimeout: false,
            // Stores original YAML when entering edit mode so diff view can compare
            originalYAML: null,
        };
    },
    computed: {
        endpointDisplay() {
            return this.$root.endpointDisplayFunction(this.endpoint);
        },
        urls() {
            if (!this.envsubstJSONConfig["x-dockge"] || !this.envsubstJSONConfig["x-dockge"].urls || !Array.isArray(this.envsubstJSONConfig["x-dockge"].urls)) {
                return [];
            }
            let urls = [];
            for (const url of this.envsubstJSONConfig["x-dockge"].urls) {
                let display;
                try {
                    let obj = new URL(url);
                    let pathname = obj.pathname;
                    if (pathname === "/") pathname = "";
                    display = obj.host + pathname + obj.search;
                } catch (e) {
                    display = url;
                }
                urls.push({ display, url });
            }
            return urls;
        },
        isAdd() {
            return this.$route.path === "/compose" && !this.submitted;
        },
        globalStack() {
            return this.$root.completeStackList[this.stack.name + "_" + this.endpoint];
        },
        status() {
            return this.globalStack?.status;
        },
        active() {
            return this.status === RUNNING;
        },
        terminalName() {
            if (!this.stack.name) return "";
            return getComposeTerminalName(this.endpoint, this.stack.name);
        },
        combinedTerminalName() {
            if (!this.stack.name) return "";
            return getCombinedTerminalName(this.endpoint, this.stack.name);
        },
        networks() {
            return this.jsonConfig.networks;
        },
        endpoint() {
            return this.stack.endpoint || this.$route.params.endpoint || "";
        },
        url() {
            if (this.stack.endpoint) {
                return `/compose/${this.stack.name}/${this.stack.endpoint}`;
            } else {
                return `/compose/${this.stack.name}`;
            }
        },
    },
    watch: {
        "stack.composeYAML": {
            handler() {
                if (this.editorFocus) this.yamlCodeChange();
            },
            deep: true,
        },
        "stack.composeENV": {
            handler() {
                if (this.editorFocus) this.yamlCodeChange();
            },
            deep: true,
        },
        jsonConfig: {
            handler() {
                if (!this.editorFocus) {
                    let doc = new Document(this.jsonConfig);
                    if (this.yamlDoc) copyYAMLComments(doc, this.yamlDoc);
                    this.stack.composeYAML = doc.toString();
                    this.yamlDoc = doc;
                }
            },
            deep: true,
        },
    },
    mounted() {
        if (this.isAdd) {
            this.processing = false;
            this.isEditMode = true;
            let composeYAML = this.$root.composeTemplate || template;
            let composeENV = this.$root.envTemplate || envDefault;
            this.$root.composeTemplate = "";
            this.$root.envTemplate = "";
            this.stack = { name: "", composeYAML, composeENV, isManagedByDockge: true, endpoint: "" };
            this.yamlCodeChange();
        } else {
            this.stack.name = this.$route.params.stackName;
            this.loadStack();
        }
        this.requestServiceStatus();
    },
    methods: {
        startServiceStatusTimeout() {
            clearTimeout(serviceStatusTimeout);
            serviceStatusTimeout = setTimeout(async () => { this.requestServiceStatus(); }, 5000);
        },
        requestServiceStatus() {
            if (this.isAdd) return;
            this.$root.emitAgent(this.endpoint, "serviceStatusList", this.stack.name, (res) => {
                if (res.ok) this.serviceStatusList = res.serviceStatusList;
                if (!this.stopServiceStatusTimeout) this.startServiceStatusTimeout();
            });
        },
        exitConfirm(next) {
            if (this.isEditMode) {
                if (confirm(this.$t("confirmLeaveStack"))) { this.exitAction(); next(); }
                else next(false);
            } else {
                this.exitAction(); next();
            }
        },
        exitAction() {
            this.stopServiceStatusTimeout = true;
            clearTimeout(serviceStatusTimeout);
            this.$root.emitAgent(this.endpoint, "leaveCombinedTerminal", this.stack.name, () => {});
        },
        bindTerminal() {
            this.$refs.progressTerminal?.bind(this.endpoint, this.terminalName);
        },
        loadStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "getStack", this.stack.name, (res) => {
                if (res.ok) {
                    this.stack = res.stack;
                    this.yamlCodeChange();
                    this.processing = false;
                    this.bindTerminal();
                } else {
                    this.$root.toastRes(res);
                }
            });
        },
        deployStack() {
            this.processing = true;
            if (!this.jsonConfig.services) { this.$root.toastError("No services found in compose.yaml"); this.processing = false; return; }
            if (typeof this.jsonConfig.services !== "object") { this.$root.toastError("Services must be an object"); this.processing = false; return; }
            let serviceNameList = Object.keys(this.jsonConfig.services);
            if (!this.stack.name && serviceNameList.length > 0) {
                let serviceName = serviceNameList[0];
                let service = this.jsonConfig.services[serviceName];
                this.stack.name = (service && service.container_name) ? service.container_name : serviceName;
            }
            this.bindTerminal();
            // Save snapshot for diff view before deploying
            if (!this.isAdd && this.originalYAML) {
                this.$root.getSocket().emit("saveComposeSnapshot", { stackName: this.stack.name, composeYaml: this.originalYAML });
            }
            this.$root.emitAgent(this.stack.endpoint, "deployStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) { this.isEditMode = false; this.originalYAML = null; this.$router.push(this.url); }
            });
        },
        saveStack() {
            this.processing = true;
            if (!this.isAdd && this.originalYAML) {
                this.$root.getSocket().emit("saveComposeSnapshot", { stackName: this.stack.name, composeYaml: this.originalYAML });
            }
            this.$root.emitAgent(this.stack.endpoint, "saveStack", this.stack.name, this.stack.composeYAML, this.stack.composeENV, this.isAdd, (res) => {
                this.processing = false;
                this.$root.toastRes(res);
                if (res.ok) { this.isEditMode = false; this.originalYAML = null; this.$router.push(this.url); }
            });
        },
        startStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "startStack", this.stack.name, (res) => { this.processing = false; this.$root.toastRes(res); });
        },
        stopStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "stopStack", this.stack.name, (res) => { this.processing = false; this.$root.toastRes(res); });
        },
        downStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "downStack", this.stack.name, (res) => { this.processing = false; this.$root.toastRes(res); });
        },
        restartStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "restartStack", this.stack.name, (res) => { this.processing = false; this.$root.toastRes(res); });
        },
        updateStack() {
            this.processing = true;
            this.$root.emitAgent(this.endpoint, "updateStack", this.stack.name, (res) => { this.processing = false; this.$root.toastRes(res); });
        },
        deleteDialog() {
            this.$root.emitAgent(this.endpoint, "deleteStack", this.stack.name, (res) => {
                this.$root.toastRes(res);
                if (res.ok) this.$router.push("/");
            });
        },
        discardStack() {
            this.loadStack();
            this.isEditMode = false;
            this.originalYAML = null;
        },
        enableEditMode() {
            // Capture current YAML before edits so diff view has something to compare against
            this.originalYAML = this.stack.composeYAML;
            this.isEditMode = true;
        },
        yamlToJSON(yaml) {
            let doc = parseDocument(yaml);
            if (doc.errors.length > 0) throw doc.errors[0];
            const config = doc.toJS() ?? {};
            if (!config.services) config.services = {};
            if (Array.isArray(config.services) || typeof config.services !== "object") throw new Error("Services must be an object");
            return { config, doc };
        },
        yamlCodeChange() {
            try {
                let { config, doc } = this.yamlToJSON(this.stack.composeYAML);
                this.yamlDoc = doc;
                this.jsonConfig = config;
                let env = dotenv.parse(this.stack.composeENV);
                let envYAML = envsubstYAML(this.stack.composeYAML, env);
                this.envsubstJSONConfig = this.yamlToJSON(envYAML).config;
                clearTimeout(yamlErrorTimeout);
                this.yamlError = "";
            } catch (e) {
                clearTimeout(yamlErrorTimeout);
                if (this.yamlError) { this.yamlError = e.message; }
                else { yamlErrorTimeout = setTimeout(() => { this.yamlError = e.message; }, 3000); }
            }
        },
        addContainer() {
            this.checkYAML();
            if (this.jsonConfig.services[this.newContainerName]) { this.$root.toastError("Container name already exists"); return; }
            if (!this.newContainerName) { this.$root.toastError("Container name cannot be empty"); return; }
            this.jsonConfig.services[this.newContainerName] = { restart: "unless-stopped" };
            this.newContainerName = "";
            let element = this.$refs.containerList.lastElementChild;
            element.scrollIntoView({ block: "start", behavior: "smooth" });
        },
        checkYAML() {},
        stackNameToLowercase() {
            this.stack.name = this.stack?.name?.toLowerCase();
        },
    }
};
</script>

<style scoped lang="scss">
@import "../styles/vars.scss";

.terminal {
    height: 200px;
}

.editor-box {
    font-family: 'JetBrains Mono', monospace;
    font-size: 14px;
}

.agent-name {
    font-size: 13px;
    color: $dark-font-color3;
}
</style>
