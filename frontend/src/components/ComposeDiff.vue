<template>
  <div class="compose-diff">
    <div class="d-flex justify-content-between align-items-center mb-2">
      <h6 class="mb-0 text-muted">Changes</h6>
      <button class="btn btn-sm btn-link py-0" @click="$emit('close')">Close</button>
    </div>

    <div v-if="!lines.length" class="text-muted" style="font-size:0.85em">No changes.</div>

    <div v-else class="diff-view font-monospace">
      <div
        v-for="(line, i) in lines"
        :key="i"
        :class="lineClass(line)"
        class="diff-line"
      >
        <span class="diff-gutter">{{ linePrefix(line) }}</span><span class="diff-content">{{ line.slice(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

/**
 * Minimal unified-diff renderer.
 * `oldYaml` and `newYaml` are the two YAML strings to compare.
 * Lines starting with '+' are additions, '-' are removals, ' ' are context.
 */
export default defineComponent({
  name: "ComposeDiff",
  emits: ["close"],
  props: {
    oldYaml: { type: String, default: "" },
    newYaml: { type: String, default: "" },
  },
  computed: {
    lines(): string[] {
      const oldLines = this.oldYaml.split("\n");
      const newLines = this.newYaml.split("\n");
      return computeDiff(oldLines, newLines);
    },
  },
  methods: {
    lineClass(line: string) {
      if (line.startsWith("+")) return "diff-add";
      if (line.startsWith("-")) return "diff-remove";
      return "diff-context";
    },
    linePrefix(line: string) {
      if (line.startsWith("+")) return "+";
      if (line.startsWith("-")) return "-";
      return " ";
    },
  },
});

/** Simple LCS-based diff — no external dependency */
function computeDiff(a: string[], b: string[]): string[] {
  // Build LCS table
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);

  // Traceback
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) {
      result.unshift(" " + a[i-1]); i--; j--;
    } else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) {
      result.unshift("+" + b[j-1]); j--;
    } else {
      result.unshift("-" + a[i-1]); i--;
    }
  }
  return result;
}
</script>

<style scoped>
.diff-view { max-height: 400px; overflow-y: auto; border: 1px solid var(--bs-border-color); border-radius: 6px; }
.diff-line { display: flex; font-size: 0.8em; line-height: 1.5; white-space: pre; }
.diff-gutter { width: 16px; text-align: center; flex-shrink: 0; }
.diff-add { background: rgba(25, 135, 84, 0.15); color: #198754; }
.diff-remove { background: rgba(220, 53, 69, 0.15); color: #dc3545; }
.diff-context { color: var(--bs-body-color); }
.diff-content { flex: 1; padding: 0 8px; overflow-x: auto; }
</style>
