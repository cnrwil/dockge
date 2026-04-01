<template>
  <transition name="slide-fade" appear>
    <div>
      <h1 class="mb-4">Audit Log</h1>

      <!-- Filters -->
      <div class="row g-2 mb-3">
        <div class="col-auto">
          <input v-model="filterUsername" class="form-control" placeholder="Filter by username" @keyup.enter="load" />
        </div>
        <div class="col-auto">
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
          <button class="btn btn-sm btn-normal" @click="showPrune = true">Prune old entries</button>
        </div>
      </div>

      <!-- Table -->
      <div class="shadow-box big-padding">
        <div class="table-responsive">
          <table class="table table-borderless table-hover align-middle mb-0" style="font-size: 0.875rem; font-family: 'JetBrains Mono', monospace;">
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
                <td class="text-nowrap" style="color: var(--bs-secondary-color); font-size: 0.8em;">{{ formatDate(e.created_at) }}</td>
                <td>{{ e.username }}</td>
                <td><span :class="actionBadgeClass(e.action)">{{ e.action }}</span></td>
                <td>{{ e.target ?? '—' }}</td>
                <td style="color: var(--bs-secondary-color); font-size: 0.8em;">{{ e.ip ?? '—' }}</td>
                <td>
                  <button v-if="e.detail" class="btn btn-sm btn-normal py-0" @click="selectedDetail = e.detail">View</button>
                  <span v-else style="color: var(--bs-secondary-color);">—</span>
                </td>
              </tr>
              <tr v-if="!entries.length && !loading">
                <td colspan="6" class="text-center" style="color: var(--bs-secondary-color);">No entries found.</td>
              </tr>
              <tr v-if="loading">
                <td colspan="6" class="text-center"><div class="spinner-border spinner-border-sm" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Pagination -->
        <div class="d-flex justify-content-between align-items-center mt-3">
          <small style="color: var(--bs-secondary-color);">{{ total }} total entries</small>
          <div class="btn-group">
            <button class="btn btn-sm btn-normal" :disabled="page <= 1" @click="changePage(page - 1)">&laquo; Prev</button>
            <button class="btn btn-sm btn-normal disabled">Page {{ page }}</button>
            <button class="btn btn-sm btn-normal" :disabled="page >= totalPages" @click="changePage(page + 1)">Next &raquo;</button>
          </div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="selectedDetail" class="modal-overlay" @click.self="selectedDetail = null">
        <div class="modal-content p-4">
          <h5 class="mb-3">Entry Detail</h5>
          <pre class="shadow-box p-3" style="max-height: 300px; overflow: auto; font-size: 0.8em;">{{ formatDetail(selectedDetail) }}</pre>
          <div class="text-end mt-3">
            <button class="btn btn-normal" @click="selectedDetail = null">Close</button>
          </div>
        </div>
      </div>

      <!-- Prune Modal -->
      <div v-if="showPrune" class="modal-overlay" @click.self="showPrune = false">
        <div class="modal-content p-4">
          <h5 class="mb-3">Prune Audit Log</h5>
          <p>Delete all entries older than:</p>
          <div class="input-group mb-3">
            <input v-model.number="pruneDays" type="number" min="1" class="form-control" />
            <span class="input-group-text">days</span>
          </div>
          <p v-if="pruneMsg" class="text-success">{{ pruneMsg }}</p>
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-normal" @click="showPrune = false">Cancel</button>
            <button class="btn btn-danger" @click="prune">Prune</button>
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
        if (res.ok) { this.pruneMsg = res.msg; this.load(); }
        else this.toast.error(res.msg);
      });
    },
    formatDate(d: string): string { return new Date(d).toLocaleString(); },
    formatDetail(d: string): string { try { return JSON.stringify(JSON.parse(d), null, 2); } catch { return d; } },
    actionBadgeClass(action: string): string {
      if (action.startsWith("stack")) return "badge bg-primary";
      if (action.startsWith("user")) return "badge bg-warning text-dark";
      if (action.startsWith("auth")) return "badge bg-success";
      if (action.startsWith("settings")) return "badge bg-info text-dark";
      return "badge bg-secondary";
    },
  },
});
</script>

<style lang="scss" scoped>
@import "../styles/vars.scss";

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  width: 100%;
  max-width: 500px;
  border-radius: 1rem;
  box-shadow: 0 15px 70px rgba(0, 0, 0, 0.3);
}
</style>
