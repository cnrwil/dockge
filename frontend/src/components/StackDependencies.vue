<template>
  <div>
    <h6 class="text-muted mb-2">Depends On</h6>
    <div class="d-flex flex-wrap gap-1 mb-2"><span v-for="dep in dependencies" :key="dep" class="badge bg-secondary d-flex align-items-center gap-1">{{ dep }}<button type="button" class="btn-close btn-close-white" style="font-size:0.55em" @click="removeDep(dep)" /></span><span v-if="!dependencies.length" class="text-muted" style="font-size:0.85em">None</span></div>
    <div class="input-group input-group-sm" style="max-width:300px"><select v-model="selected" class="form-select"><option value="">Add dependency…</option><option v-for="s in availableStacks" :key="s" :value="s">{{ s }}</option></select><button class="btn btn-outline-primary" :disabled="!selected" @click="addDep">Add</button></div>
    <p v-if="error" class="text-danger mt-1" style="font-size:0.85em">{{ error }}</p>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "StackDependencies",
  props: { stackName: { type: String, required: true }, allStacks: { type: Array as () => string[], default: () => [] } },
  data() { return { dependencies: [] as string[], selected: "", error: "" }; },
  computed: { availableStacks(): string[] { return this.allStacks.filter((s) => s !== this.stackName && !this.dependencies.includes(s)); } },
  mounted() { this.load(); },
  methods: {
    load() { this.$root?.getSocket().emit("getStackDependencies", this.stackName, (res: any) => { if (res.ok) this.dependencies = res.dependencies; }); },
    addDep() { if (!this.selected) return; this.error = ""; const updated = [...this.dependencies, this.selected]; this.$root?.getSocket().emit("setStackDependencies", this.stackName, updated, (res: any) => { if (res.ok) { this.dependencies = updated; this.selected = ""; } else this.error = res.msg; }); },
    removeDep(dep: string) { const updated = this.dependencies.filter((d) => d !== dep); this.$root?.getSocket().emit("setStackDependencies", this.stackName, updated, (res: any) => { if (res.ok) this.dependencies = updated; else this.error = res.msg; }); },
  },
});
</script>
