<template>
  <div class="resource-usage">
    <div v-if="loading" class="text-center py-2">
      <div class="spinner-border spinner-border-sm" />
    </div>
    <div v-else-if="stats">
      <!-- Summary row -->
      <div class="d-flex gap-3 mb-2 flex-wrap">
        <div class="resource-pill">
          <span class="label">CPU</span>
          <span class="value">{{ stats.totalCpuPct.toFixed(1) }}%</span>
          <div class="mini-bar"><div class="mini-bar-fill cpu" :style="{ width: Math.min(stats.totalCpuPct, 100) + '%' }" /></div>
        </div>
        <div class="resource-pill">
          <span class="label">Memory</span>
          <span class="value">{{ formatMB(stats.totalMemUsageMB) }}</span>
          <div class="mini-bar"><div class="mini-bar-fill mem" :style="{ width: Math.min(memPct, 100) + '%' }" /></div>
        </div>
      </div>
      <!-- Per-container breakdown -->
      <table class="table table-sm table-borderless mb-0" style="font-size:0.8em">
        <thead><tr class="text-muted"><th>Container</th><th>CPU</th><th>Mem</th><th>Net I/O</th></tr></thead>
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
        <small class="text-muted">Updated {{ updatedAt }}</small>
        <button class="btn btn-sm btn-link py-0 ms-2" @click="load">Refresh</button>
      </div>
    </div>
    <p v-else class="text-muted" style="font-size:0.85em">No resource data available.</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "StackResourceUsage",
  props: { stackName: { type: String, required: true } },
  data() {
    return { stats: null as any, loading: false, updatedAt: "" };
  },
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
      this.$root?.getSocket().emit("getStackResourceUsage", this.stackName, (res: any) => {
        this.loading = false;
        if (res.ok) {
          this.stats = res.stats;
          this.updatedAt = new Date().toLocaleTimeString();
        }
      });
    },
    formatMB(mb: number): string {
      if (mb >= 1024) return (mb / 1024).toFixed(1) + " GB";
      return mb.toFixed(0) + " MB";
    },
  },
});
</script>

<style scoped>
.resource-pill { display:flex; flex-direction:column; min-width:100px; }
.resource-pill .label { font-size:0.75em; text-transform:uppercase; color:var(--bs-secondary); }
.resource-pill .value { font-size:1.1em; font-weight:600; }
.mini-bar { height:4px; border-radius:2px; background:var(--bs-secondary-bg); overflow:hidden; margin-top:2px; }
.mini-bar-fill { height:100%; border-radius:2px; transition:width 0.3s; }
.mini-bar-fill.cpu { background:#0d6efd; }
.mini-bar-fill.mem { background:#198754; }
</style>
