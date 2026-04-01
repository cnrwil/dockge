<template>
  <div>
    <div v-if="loading" class="text-center py-2">
      <div class="spinner-border spinner-border-sm" />
    </div>
    <div v-else-if="stats">
      <!-- Summary pills -->
      <div class="d-flex gap-4 mb-3">
        <div>
          <div style="font-size: 0.7em; text-transform: uppercase; color: var(--bs-secondary-color);">CPU</div>
          <div style="font-size: 1.1em; font-weight: 600;">{{ stats.totalCpuPct.toFixed(1) }}%</div>
          <div class="mini-bar"><div class="mini-bar-fill cpu" :style="{ width: Math.min(stats.totalCpuPct, 100) + '%' }" /></div>
        </div>
        <div>
          <div style="font-size: 0.7em; text-transform: uppercase; color: var(--bs-secondary-color);">Memory</div>
          <div style="font-size: 1.1em; font-weight: 600;">{{ formatMB(stats.totalMemUsageMB) }}</div>
          <div class="mini-bar"><div class="mini-bar-fill mem" :style="{ width: Math.min(memPct, 100) + '%' }" /></div>
        </div>
      </div>
      <!-- Per-container table -->
      <table class="table table-borderless table-sm mb-0" style="font-size: 0.8em;">
        <thead><tr style="color: var(--bs-secondary-color);"><th>Container</th><th>CPU</th><th>Mem</th><th>Net I/O</th></tr></thead>
        <tbody>
          <tr v-for="c in stats.containers" :key="c.name">
            <td>{{ c.name }}</td>
            <td>{{ c.cpuPct.toFixed(1) }}%</td>
            <td>{{ formatMB(c.memUsageMB) }} / {{ formatMB(c.memLimitMB) }}</td>
            <td>{{ formatMB(c.netRxMB) }} / {{ formatMB(c.netTxMB) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="text-end mt-1">
        <small style="color: var(--bs-secondary-color);">Updated {{ updatedAt }}</small>
        <button class="btn btn-sm btn-normal py-0 ms-2" @click="load">Refresh</button>
      </div>
    </div>
    <p v-else style="color: var(--bs-secondary-color); font-size: 0.85em;">No data — stack may not be running.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "StackResourceUsage",
  props: { stackName: { type: String, required: true } },
  data() { return { stats: null as any, loading: false, updatedAt: "" }; },
  computed: {
    memPct(): number {
      if (!this.stats?.containers?.length) return 0;
      const total = this.stats.containers.reduce((s: number, c: any) => s + c.memLimitMB, 0);
      return total > 0 ? (this.stats.totalMemUsageMB / total) * 100 : 0;
    },
  },
  mounted() { this.load(); },
  methods: {
    load() {
      this.loading = true;
      (this.$root as any)?.getSocket().emit("getStackResourceUsage", this.stackName, (res: any) => {
        this.loading = false;
        if (res.ok) { this.stats = res.stats; this.updatedAt = new Date().toLocaleTimeString(); }
      });
    },
    formatMB(mb: number): string { return mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb.toFixed(0) + " MB"; },
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.mini-bar {
  height: 4px;
  border-radius: 2px;
  background: $dark-border-color;
  overflow: hidden;
  margin-top: 3px;
  width: 80px;
}

.mini-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s;
  &.cpu { background: $primary; }
  &.mem { background: #86e6a9; }
}
</style>
