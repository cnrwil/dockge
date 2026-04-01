<template>
  <div>
    <div v-if="validating" class="d-flex align-items-center gap-2 text-muted" style="font-size:0.85em">
      <div class="spinner-border spinner-border-sm" /> Validating…
    </div>
    <div v-else-if="result">
      <div v-if="result.valid" class="alert alert-success py-1 px-2 mb-1" style="font-size:0.85em">
        <font-awesome-icon icon="check-circle" class="me-1" /> Compose is valid
      </div>
      <div v-else class="alert alert-danger py-1 px-2 mb-1" style="font-size:0.85em">
        <font-awesome-icon icon="times-circle" class="me-1" /> Compose has errors
      </div>
      <div v-for="(w, i) in result.warnings" :key="'w'+i" class="alert alert-warning py-1 px-2 mb-1" style="font-size:0.8em">
        {{ w }}
      </div>
      <div v-for="(e, i) in result.errors" :key="'e'+i" class="alert alert-danger py-1 px-2 mb-1" style="font-size:0.8em;font-family:monospace">
        {{ e }}
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "ComposeValidationBanner",
  props: { composeYaml: { type: String, default: "" }, debounce: { type: Number, default: 800 } },
  data() { return { validating: false, result: null as any, debounceTimer: null as any }; },
  watch: {
    composeYaml(val: string) {
      this.result = null;
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (!val.trim()) return;
      this.debounceTimer = setTimeout(() => this.validate(), this.debounce);
    },
  },
  methods: {
    validate() {
      this.validating = true;
      (this.$root as any)?.getSocket().emit("validateCompose", this.composeYaml, (res: any) => {
        this.validating = false;
        if (res.ok) this.result = res;
      });
    },
  },
});
</script>
