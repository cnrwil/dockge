<template>
  <transition name="slide-fade" appear>
    <div>
      <h1 class="mb-4">Audit Log</h1>

      <!-- Filters -->
      <div class="row g-2 mb-3">
        <div class="col-auto">
          <input
            v-model="filterUsername"
            class="form-control"
            placeholder="Filter by username"
            @keyup.enter="load"
          />
        </div>
        <div class="col-auto">
          <select v-model="filterAction" class="form-select" @change="load">
            <option value="">All actions</option>
            <option value="stack">Stack actions</option>
            <option value="user">User actions</option>
            <option value="auth">Auth actions</option>
            <option value="settings">Settings actions</option>
          </select>
        </div>
        <div class="col-auto">
          <button class="btn btn-outline-secondary" @click="load">Search</button>
        </div>
        <div class="col-auto ms-auto">
          <button class="btn btn-outline-danger btn-sm" @click="showPrune = true">Prune old entries</button>
        </div>
      </div>

      <!-- Table -->
      <div class="table-responsive">
        <table class="table table-borderless table-hover table-sm align-middle font-monospace">
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
              <td class="text-nowrap text-muted" style="font-size:0.8em">{{ formatDate(e.created_at) }}</td>
              <td>{{ e.username }}</td>
              <td><span :class="actionBadgeClass(e.action)">{{ e.action }}</span></td>
              <td>{{ e.target ?? '—' }}</td>
              <td class="text-muted" style="font-size:0.8em">{{ e.ip ?? '—' }}</td>
              <td>
                <button
                  v-if="e.detail"
                  class="btn btn-sm btn-outline-secondary py-0"
                  @click="selectedDetail = e.detail"
                >View</button>
                <span v-else class="text-muted">—</span>
              </td>
            </tr>
            <tr v-if="entries.length === 0 && !loading">
              <td colspan="6" class="text-center text-muted">No entries found.</td>
            </tr>
            <tr v-if="loading">
              <td colspan="6" class="text-center">
                <div class="spinner-border spinner-border-sm" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div class="d-flex justify-content-between align-items-center mt-2">
        <small class="text-muted">{{ total }} total entries</small>
        <div class="btn-group">
          <button class="btn btn-sm btn-outline-secondary" :disabled="page <= 1" @click="changePage(page - 1)">&laquo; Prev</button>
          <button class="btn btn-sm btn-outline-secondary disabled">Page {{ page }}</button>
          <button class="btn btn-sm btn-outline-secondary" :disabled="page >= totalPages" @click="changePage(page + 1)">Next &raquo;</button>
        </div>
      </div>

      <!-- Detail Modal -->
      <div v-if="selectedDetail" class="modal-backdrop-custom" @click.self="selectedDetail = null">
        <div class="modal-box">
          <h5 class="mb-3">Entry Detail</h5>
          <pre class="bg-dark text-light p-3 rounded" style="max-height:300px;overflow:auto">{{ formatDetail(selectedDetail) }}</pre>
          <div class="text-end mt-3">
            <button class="btn btn-secondary" @click="selectedDetail = null">Close</button>
          </div>
        </div>
      </div>

      <!-- Prune Modal -->
      <div v-if="showPrune" class="modal-backdrop-custom" @click.self="showPrune = false">
        <div class="modal-box">
          <h5 class="mb-3">Prune Audit Log</h5>
          <p class="text-muted">Delete all entries older than:</p>
          <div class="input-group mb-3">
            <input v-model.number="pruneDays" type="number" min="1" class="form-control" />
            <span class="input-group-text">days</span>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-secondary" @click="showPrune = false">Cancel</button>
            <button class="btn btn-danger" @click="prune">Prune</button>
          </div>
          <p v-if="pruneMsg" class="mt-2 text-success">{{ pruneMsg }}</p>
        </div>
      </div>

    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useToast } from "vue-toastification";

interface AuditEntry {
  id: number;
  username: string;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  created_at: string;
}

export default defineComponent({
  name: "AuditLog",
  setup() {
    return { toast: useToast() };
  },
  data() {
    return {
      entries: [] as AuditEntry[],
      total: 0,
      page: 1,
      pageSize: 50,
      loading: false,
      filterUsername: "",
      filterAction: "",
      selectedDetail: null as string | null,
      showPrune: false,
      pruneDays: 90,
      pruneMsg: "",
    };
  },
  computed: {
    totalPages(): number {
      return Math.max(1, Math.ceil(this.total / this.pageSize));
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    load() {
      this.loading = true;
      this.$root?.getSocket().emit(
        "admin:getAuditLog",
        { page: this.page, action: this.filterAction, username: this.filterUsername },
        (res: any) => {
          this.loading = false;
          if (res.ok) {
            this.entries = res.entries;
            this.total = res.total;
            this.pageSize = res.pageSize;
          } else {
            this.toast.error(res.msg ?? "Failed to load audit log.");
          }
        }
      );
    },
    changePage(p: number) {
      this.page = p;
      this.load();
    },
    prune() {
      this.$root?.getSocket().emit("admin:pruneAuditLog", this.pruneDays, (res: any) => {
        if (res.ok) {
          this.pruneMsg = res.msg;
          this.load();
        } else {
          this.toast.error(res.msg);
        }
      });
    },
    formatDate(d: string): string {
      return new Date(d).toLocaleString();
    },
    formatDetail(d: string): string {
      try {
        return JSON.stringify(JSON.parse(d), null, 2);
      } catch {
        return d;
      }
    },
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

<style scoped>
.modal-backdrop-custom {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}
.modal-box {
  background: var(--bs-body-bg);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
}
</style>
