<template>
  <transition name="slide-fade" appear>
    <div>
      <h1 class="mb-4">Audit Log</h1>

      <div class="shadow-box big-padding mb-3">
        <div class="row g-2 align-items-end">
          <div class="col-auto">
            <label class="form-label mb-1">Username</label>
            <input v-model="filterUsername" class="form-control" placeholder="Filter by username" @keyup.enter="load" />
          </div>
          <div class="col-auto">
            <label class="form-label mb-1">Action</label>
            <select v-model="filterAction" class="form-select" @change="load">
              <option value="">All actions</option>
              <option value="stack">Stack</option>
              <option value="user">User</option>
              <option value="auth">Auth</option>
              <option value="settings">Settings</option>
            </select>
          </div>
          <div class="col-auto">
            <button class="btn btn-normal" @click="load">Search</button>
          </div>
          <div class="col-auto ms-auto">
            <button class="btn btn-sm btn-danger" @click="showPrune = true">Prune old entries</button>
          </div>
        </div>
      </div>

      <div class="shadow-box big-padding">
        <table class="table table-borderless table-hover table-sm align-middle mb-0" style="font-family: monospace; font-size: 0.85em;">
          <thead>
            <tr>
              <th>Time</th>
              <th>User</th>
              <th>Action</th>
              <th>Target</th>
              <th>IP</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in entries" :key="e.id">
              <td class="text-muted text-nowrap">{{ formatDate(e.created_at) }}</td>
              <td>{{ e.username }}</td>
              <td><span :class="actionBadgeClass(e.action)">{{ e.action }}</span></td>
              <td>{{ e.target ?? '—' }}</td>
              <td class="text-muted">{{ e.ip ?? '—' }}</td>
              <td>
                <button v-if="e.detail" class="btn btn-sm btn-normal py-0" @click="selectedDetail = e.detail">View</button>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
            <tr v-if="!entries.length && !loading">
              <td colspan="6" class="text-center text-muted py-3">No entries found.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="6" class="text-center py-3"><div class="spinner-border spinner-border-sm" /></td>
            </tr>
          </tbody>
        </table>

        <div class="d-flex justify-content-between align-items-center mt-3">
          <small class="text-muted">{{ total }} total entries</small>
          <div class="btn-group">
            <button class="btn btn-sm btn-normal" :disabled="page <= 1" @click="changePage(page - 1)">&laquo; Prev</button>
            <button class="btn btn-sm btn-normal disabled">Page {{ page }}</button>
            <button class="btn btn-sm btn-normal" :disabled="page >= totalPages" @click="changePage(page + 1)">Next &raquo;</button>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="selectedDetail" class="modal d-block" tabindex="-1" @click.self="selectedDetail = null">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Entry Detail</h5>
              <button type="button" class="btn-close" @click="selectedDetail = null" />
            </div>
            <div class="modal-body">
              <pre class="shadow-box big-padding mb-0" style="max-height:300px;overflow:auto;font-size:0.85em">{{ formatDetail(selectedDetail) }}</pre>
            </div>
          </div>
        </div>
      </div>

      <!-- Prune Modal -->
      <div v-if="showPrune" class="modal d-block" tabindex="-1" @click.self="showPrune = false">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Prune Audit Log</h5>
              <button type="button" class="btn-close" @click="showPrune = false" />
            </div>
            <div class="modal-body">
              <p class="text-muted">Delete all entries older than:</p>
              <div class="input-group">
                <input v-model.number="pruneDays" type="number" min="1" class="form-control" />
                <span class="input-group-text">days</span>
              </div>
              <p v-if="pruneMsg" class="mt-2 text-success mb-0">{{ pruneMsg }}</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-normal" @click="showPrune = false">Cancel</button>
              <button class="btn btn-danger" @click="prune">Prune</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useToast } from "vue-toastification";

export default defineComponent({
  name: "AuditLog",
  setup() { return { toast: useToast() }; },
  data() {
    return {
      entries: [] as any[],
      total: 0, page: 1, pageSize: 50,
      loading: false,
      filterUsername: "", filterAction: "",
      selectedDetail: null as string | null,
      showPrune: false, pruneDays: 90, pruneMsg: "",
    };
  },
  computed: {
    totalPages(): number { return Math.max(1, Math.ceil(this.total / this.pageSize)); },
  },
  mounted() { this.load(); },
  methods: {
    load() {
      this.loading = true;
      (this.$root as any)?.getSocket().emit("admin:getAuditLog", { page: this.page, action: this.filterAction, username: this.filterUsername }, (res: any) => {
        this.loading = false;
        if (res.ok) { this.entries = res.entries; this.total = res.total; this.pageSize = res.pageSize; }
        else this.toast.error(res.msg ?? "Failed to load audit log.");
      });
    },
    changePage(p: number) { this.page = p; this.load(); },
    prune() {
      (this.$root as any)?.getSocket().emit("admin:pruneAuditLog", this.pruneDays, (res: any) => {
        if (res.ok) { this.pruneMsg = res.msg; this.load(); } else this.toast.error(res.msg);
      });
    },
    formatDate(d: string): string { return new Date(d).toLocaleString(); },
    formatDetail(d: string): string { try { return JSON.stringify(JSON.parse(d), null, 2); } catch { return d; } },
    actionBadgeClass(a: string): string {
      if (a.startsWith("stack")) return "badge bg-primary";
      if (a.startsWith("user")) return "badge bg-warning text-dark";
      if (a.startsWith("auth")) return "badge bg-success";
      if (a.startsWith("settings")) return "badge bg-info text-dark";
      return "badge bg-secondary";
    },
  },
});
</script>
