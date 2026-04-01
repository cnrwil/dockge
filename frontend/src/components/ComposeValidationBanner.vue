<template>
  <div>
    <div v-if="validating" class="d-flex align-items-center gap-2 text-muted mb-2" style="font-size:0.85em"><div class="spinner-border spinner-border-sm" /> Validating compose…</div>
    <div v-else-if="result && result.valid" class="mb-2"><div class="alert alert-success py-1 px-2 mb-1" style="font-size:0.85em"><i class="fas fa-check-circle me-1" /> Compose is valid</div><div v-for="(w, i) in result.warnings" :key="i" class="alert alert-warning py-1 px-2 mb-1" style="font-size:0.8em"><i class="fas fa-exclamation-triangle me-1" /> {{ w }}</div></div>
    <div v-else-if="result && !result.valid" class="mb-2"><div class="alert alert-danger py-1 px-2 mb-1" style="font-size:0.85em"><i class="fas fa-times-circle me-1" /> Compose has errors</div><div v-for="(e, i) in result.errors" :key="i" class="alert alert-danger py-1 px-2 mb-1" style="font-size:0.8em;font-family:monospace">{{ e }}</div></div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "ComposeValidationBanner",
  props: { composeYaml: { type: String, default: "" }, debounce: { type: Number, default: 800 } },
  data() { return { validating: false, result: null as any, debounceTimer: null as any }; },
  watch: { composeYaml(val: string) { this.result = null; if (this.debounceTimer) clearTimeout(this.debounceTimer); if (!val.trim()) return; this.debounceTimer = setTimeout(() => this.validate(), this.debounce); } },
  methods: { validate() { this.validating = true; this.$root?.getSocket().emit("validateCompose", this.composeYaml, (res: any) => { this.validating = false; if (res.ok) this.result = res; }); } },
});
</script>
