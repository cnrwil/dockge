<template>
  <div>
    <div v-if="loading" class="text-center py-2">
      <div class="spinner-border spinner-border-sm" />
    </div>
    <div v-else-if="stats && stats.containers.length > 0">
      <!-- Summary pills -->
      <div class="d-flex gap-4 mb-3">
        <div>
          <div class="stat-label">CPU</div>
          <div class="stat-value">{{ stats.totalCpuPct.toFixed(1) }}%</div>
          <div class="mini-bar"><div class="mini-bar-fill cpu" :style="{ width: Math.min(stats.totalCpuPct, 100) + '%' }" /></div>
        </div>
        <div>
          <div class="stat-label">Memory</div>
          <div class="stat-value">{{ formatMB(stats.totalMemUsageMB) }}</div>
          <div class="mini-bar"><div class="mini-bar-fill mem" :style="{ width: Math.min(memPct, 100) + '%' }" /></div>
        </div>
      </div>
      <!-- Per-container breakdown -->
      <table class="table table-borderless table-sm mb-0">
        <thead>
          <tr class="table-header">
            <th>Container</th>
            <th>CPU</th>
            <th>Memory</th>
            <th>Net I/O</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in stats.containers" :key="c.name">
            <td>{{ c.name }}</td>
            <td>{{ c.cpuPct.toFixed(1) }}%</td>
            <td>{{ formatMB(c.memUsageMB) }} / {{ formatMB(c.memLimitMB) }}</td>
            <td>{{ formatMB(c.netRxMB) }} / {{ formatMB(c.netTxMB) }}</td>
          </tr>
        </tbody>
      </table>
      <div class="d-flex justify-content-end align-items-center mt-1">
        <small class="last-updated me-2">Updated {{ updatedAt }}</small>
        <button class="btn btn-sm btn-normal py-0" @click="load">Refresh</button>
      </div>
    </div>
    <div v-else-if="stats && stats.containers.length === 0" class="no-data">
      No containers running for this stack.
    </div>
    <p v-else class="no-data">Failed to load stats.</p>
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
    formatMB(mb: number): string {
      if (!mb) return "0 MB";
      return mb >= 1024 ? (mb / 1024).toFixed(1) + " GB" : mb.toFixed(0) + " MB";
    },
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.stat-label {
  font-size: 0.7em;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: $dark-font-color3;
}

.stat-value {
  font-size: 1.1em;
  font-weight: 600;
}

.mini-bar {
  height: 4px;
  width: 80px;
  border-radius: 2px;
  background: $dark-border-color;
  overflow: hidden;
  margin-top: 3px;
}

.mini-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.4s ease;
  &.cpu { background: $primary; }
  &.mem { background: #86e6a9; }
}

.table-header th {
  color: $dark-font-color3;
  font-size: 0.82em;
}

.last-updated {
  font-size: 0.78em;
  color: $dark-font-color3;
}

.no-data {
  font-size: 0.85em;
  color: $dark-font-color3;
  margin: 0;
}

table {
  font-size: 0.82em;
}
</style>
