<template>
  <div>
    <h6 class="text-muted mb-2">Backup &amp; Export</h6>
    <div class="d-flex gap-2 flex-wrap"><button class="btn btn-sm btn-outline-secondary" :disabled="exporting" @click="exportStack"><span v-if="exporting" class="spinner-border spinner-border-sm me-1" />{{ exporting ? 'Exporting…' : 'Export as ZIP' }}</button></div>
    <p v-if="error" class="text-danger mt-2" style="font-size:0.85em">{{ error }}</p>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "StackBackup",
  props: { stackName: { type: String, required: true } },
  data() { return { exporting: false, error: "" }; },
  methods: {
    exportStack() { this.exporting = true; this.error = ""; this.$root?.getSocket().emit("exportStack", this.stackName, (res: any) => { this.exporting = false; if (res.ok) { const bytes = atob(res.data); const arr = new Uint8Array(bytes.length); for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i); const blob = new Blob([arr], { type: "application/zip" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = res.filename; a.click(); URL.revokeObjectURL(url); } else { this.error = res.msg; } }); },
  },
});
</script>
