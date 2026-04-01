<template>
  <div>
    <div v-if="loading" class="text-center py-2"><div class="spinner-border spinner-border-sm" /></div>
    <div v-else-if="stats">
      <div class="d-flex gap-4 mb-3">
        <div>
          <div class="text-muted mb-1" style="font-size:0.75em;text-transform:uppercase">CPU</div>
          <div style="font-size:1.1em;font-weight:600">{{ stats.totalCpuPct.toFixed(1) }}%</div>
          <div class="progress mt-1" style="height:4px;width:80px">
            <div class="progress-bar" :style="{ width: Math.min(stats.totalCpuPct, 100) + '%' }" />
          </div>
        </div>
        <div>
          <div class="text-muted mb-1" style="font-size:0.75em;text-transform:uppercase">Memory</div>
          <div style="font-size:1.1em;font-weight:600">{{ formatMB(stats.totalMemUsageMB) }}</div>
          <div class="progress mt-1" style="height:4px;width:80px">
            <div class="progress-bar bg-success" :style="{ width: Math.min(memPct, 100) + '%' }" />
          </div>
        </div>
      </div>
      <table class="table table-sm table-borderless mb-0" style="font-size:0.82em">
        <thead><tr class="text-muted"><th>Container</th><th>CPU</th><th>Memory</th><th>Net I/O</th></tr></thead>
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
        <button class="btn btn-sm btn-normal ms-2 py-0" @click="load">Refresh</button>
      </div>
    </div>
    <p v-else class="text-muted mb-0" style="font-size:0.85em">No containers running.</p>
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
