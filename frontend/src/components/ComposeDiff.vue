<template>
  <div class="diff-wrapper shadow-box">
    <div class="d-flex justify-content-between align-items-center mb-2 px-3 pt-2">
      <small style="color: var(--bs-secondary-color);"><font-awesome-icon icon="history" class="me-1" />Changes since last save</small>
      <button class="btn btn-sm btn-normal py-0" @click="$emit('close')">Dismiss</button>
    </div>
    <div v-if="!lines.length" class="px-3 pb-2" style="color: var(--bs-secondary-color); font-size: 0.85em;">No changes.</div>
    <div v-else class="diff-view">
      <div
        v-for="(line, i) in lines"
        :key="i"
        class="diff-line"
        :class="lineClass(line)"
      >
        <span class="diff-gutter">{{ linePrefix(line) }}</span>
        <span class="diff-content">{{ line.slice(1) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

function computeDiff(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i-1] === b[j-1]) { result.unshift(" " + a[i-1]); i--; j--; }
    else if (j > 0 && (i === 0 || dp[i][j-1] >= dp[i-1][j])) { result.unshift("+" + b[j-1]); j--; }
    else { result.unshift("-" + a[i-1]); i--; }
  }
  return result;
}

export default defineComponent({
  name: "ComposeDiff",
  emits: ["close"],
  props: {
    oldYaml: { type: String, default: "" },
    newYaml: { type: String, default: "" },
  },
  computed: {
    lines(): string[] { return computeDiff(this.oldYaml.split("\n"), this.newYaml.split("\n")); },
  },
  methods: {
    lineClass(l: string) { return l.startsWith("+") ? "diff-add" : l.startsWith("-") ? "diff-remove" : "diff-context"; },
    linePrefix(l: string) { return l.startsWith("+") ? "+" : l.startsWith("-") ? "-" : " "; },
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.diff-wrapper {
  overflow: hidden;
}

.diff-view {
  max-height: 240px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
}

.diff-line {
  display: flex;
  font-size: 0.78em;
  line-height: 1.6;
  white-space: pre;
}

.diff-gutter {
  width: 18px;
  text-align: center;
  flex-shrink: 0;
  user-select: none;
}

.diff-content {
  flex: 1;
  padding: 0 8px;
  overflow-x: auto;
}

.diff-add {
  background: rgba($primary, 0.15);
  color: $primary;
}

.diff-remove {
  background: rgba(#dc3545, 0.12);
  color: #dc3545;
}

.diff-context {
  color: $dark-font-color3;
}
</style>
