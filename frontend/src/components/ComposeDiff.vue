<template>
  <div class="compose-diff">
    <div class="d-flex justify-content-between align-items-center mb-2"><h6 class="mb-0 text-muted">Changes</h6><button class="btn btn-sm btn-link py-0" @click="$emit('close')">Close</button></div>
    <div v-if="!lines.length" class="text-muted" style="font-size:0.85em">No changes.</div>
    <div v-else class="diff-view font-monospace"><div v-for="(line, i) in lines" :key="i" :class="lineClass(line)" class="diff-line"><span class="diff-gutter">{{ linePrefix(line) }}</span><span class="diff-content">{{ line.slice(1) }}</span></div></div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
function computeDiff(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result: string[] = []; let i = m, j = n;
  while (i > 0 || j > 0) { if (i > 0 && j > 0 && a[i-1] === b[j-1]) { result.unshift(" " + a[i-1]); i--; j--; } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.unshift("+" + b[j-1]); j--; } else { result.unshift("-" + a[i-1]); i--; } }
  return result;
}
export default defineComponent({
  name: "ComposeDiff",
  emits: ["close"],
  props: { oldYaml: { type: String, default: "" }, newYaml: { type: String, default: "" } },
  computed: { lines(): string[] { return computeDiff(this.oldYaml.split("\n"), this.newYaml.split("\n")); } },
  methods: { lineClass(l: string) { return l.startsWith("+") ? "diff-add" : l.startsWith("-") ? "diff-remove" : "diff-context"; }, linePrefix(l: string) { return l.startsWith("+") ? "+" : l.startsWith("-") ? "-" : " "; } },
});
</script>
<style scoped>.diff-view{max-height:400px;overflow-y:auto;border:1px solid var(--bs-border-color);border-radius:6px}.diff-line{display:flex;font-size:.8em;line-height:1.5;white-space:pre}.diff-gutter{width:16px;text-align:center;flex-shrink:0}.diff-add{background:rgba(25,135,84,.15);color:#198754}.diff-remove{background:rgba(220,53,69,.15);color:#dc3545}.diff-context{color:var(--bs-body-color)}.diff-content{flex:1;padding:0 8px;overflow-x:auto}</style>
