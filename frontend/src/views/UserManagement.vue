<template>
  <transition name="slide-fade" appear>
    <div>
      <h1 class="mb-4">{{ $t("User Management") }}</h1>

      <div class="mb-3 d-flex justify-content-end">
        <button class="btn btn-primary" @click="showCreateModal = true">
          <font-awesome-icon icon="plus" /> Add User
        </button>
      </div>

      <!-- User Table -->
      <div class="table-responsive">
        <table class="table table-borderless table-hover align-middle">
          <thead>
            <tr>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th class="text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>{{ u.username }} <span v-if="u.id === currentUserID" class="badge bg-secondary ms-1">You</span></td>
              <td>
                <select
                  class="form-select form-select-sm w-auto"
                  :value="u.role"
                  :disabled="u.id === currentUserID"
                  @change="updateRole(u, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="viewer">Viewer</option>
                  <option value="operator">Operator</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td>
                <span :class="u.active ? 'badge bg-success' : 'badge bg-secondary'">
                  {{ u.active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="text-end">
                <button
                  class="btn btn-sm btn-outline-warning me-1"
                  :disabled="u.id === currentUserID"
                  @click="toggleActive(u)"
                >{{ u.active ? 'Deactivate' : 'Activate' }}</button>
                <button
                  class="btn btn-sm btn-outline-info me-1"
                  @click="openResetPassword(u)"
                >Reset PW</button>
                <button
                  class="btn btn-sm btn-outline-danger"
                  :disabled="u.id === currentUserID"
                  @click="deleteUser(u)"
                >Delete</button>
              </td>
            </tr>
            <tr v-if="users.length === 0">
              <td colspan="4" class="text-center text-muted">No users found.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Create User Modal -->
      <div v-if="showCreateModal" class="modal-backdrop-custom" @click.self="showCreateModal = false">
        <div class="modal-box">
          <h5 class="mb-3">Create New User</h5>
          <div class="mb-2">
            <label class="form-label">Username</label>
            <input v-model="newUser.username" class="form-control" placeholder="username" />
          </div>
          <div class="mb-2">
            <label class="form-label">Password</label>
            <input v-model="newUser.password" class="form-control" type="password" placeholder="password" />
          </div>
          <div class="mb-3">
            <label class="form-label">Role</label>
            <select v-model="newUser.role" class="form-select">
              <option value="viewer">Viewer — read-only</option>
              <option value="operator">Operator — start/stop/edit stacks</option>
              <option value="admin">Admin — full access</option>
            </select>
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
            <button class="btn btn-primary" @click="createUser">Create</button>
          </div>
          <p v-if="createError" class="text-danger mt-2">{{ createError }}</p>
        </div>
      </div>

      <!-- Reset Password Modal -->
      <div v-if="resetTarget" class="modal-backdrop-custom" @click.self="resetTarget = null">
        <div class="modal-box">
          <h5 class="mb-3">Reset Password for {{ resetTarget.username }}</h5>
          <div class="mb-3">
            <label class="form-label">New Password</label>
            <input v-model="resetPassword" class="form-control" type="password" placeholder="new password" />
          </div>
          <div class="d-flex justify-content-end gap-2">
            <button class="btn btn-secondary" @click="resetTarget = null">Cancel</button>
            <button class="btn btn-warning" @click="submitResetPassword">Reset</button>
          </div>
          <p v-if="resetError" class="text-danger mt-2">{{ resetError }}</p>
        </div>
      </div>

    </div>
  </transition>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { useToast } from "vue-toastification";

interface UserEntry {
  id: number;
  username: string;
  role: string;
  active: boolean;
}

export default defineComponent({
  name: "UserManagement",
  setup() {
    return { toast: useToast() };
  },
  data() {
    return {
      users: [] as UserEntry[],
      showCreateModal: false,
      newUser: { username: "", password: "", role: "operator" },
      createError: "",
      resetTarget: null as UserEntry | null,
      resetPassword: "",
      resetError: "",
    };
  },
  computed: {
    currentUserID(): number {
      return this.$root?.userID ?? -1;
    },
  },
  mounted() {
    this.loadUsers();
  },
  methods: {
    loadUsers() {
      this.$root?.getSocket().emit("admin:getUsers", (res: any) => {
        if (res.ok) {
          this.users = res.users;
        } else {
          this.toast.error(res.msg ?? "Failed to load users.");
        }
      });
    },
    updateRole(u: UserEntry, role: string) {
      this.$root?.getSocket().emit("admin:updateUser", { id: u.id, role }, (res: any) => {
        if (res.ok) {
          u.role = role;
          this.toast.success(`Role updated for ${u.username}.`);
        } else {
          this.toast.error(res.msg);
        }
      });
    },
    toggleActive(u: UserEntry) {
      this.$root?.getSocket().emit("admin:updateUser", { id: u.id, active: !u.active }, (res: any) => {
        if (res.ok) {
          u.active = !u.active;
          this.toast.success(`User ${u.username} ${u.active ? "activated" : "deactivated"}.`);
        } else {
          this.toast.error(res.msg);
        }
      });
    },
    createUser() {
      this.createError = "";
      this.$root?.getSocket().emit("admin:createUser", this.newUser, (res: any) => {
        if (res.ok) {
          this.showCreateModal = false;
          this.newUser = { username: "", password: "", role: "operator" };
          this.toast.success(res.msg);
          this.loadUsers();
        } else {
          this.createError = res.msg;
        }
      });
    },
    deleteUser(u: UserEntry) {
      if (!confirm(`Delete user "${u.username}"? This cannot be undone.`)) return;
      this.$root?.getSocket().emit("admin:deleteUser", u.id, (res: any) => {
        if (res.ok) {
          this.toast.success(res.msg);
          this.loadUsers();
        } else {
          this.toast.error(res.msg);
        }
      });
    },
    openResetPassword(u: UserEntry) {
      this.resetTarget = u;
      this.resetPassword = "";
      this.resetError = "";
    },
    submitResetPassword() {
      this.resetError = "";
      this.$root?.getSocket().emit("admin:resetUserPassword",
        { id: this.resetTarget!.id, newPassword: this.resetPassword },
        (res: any) => {
          if (res.ok) {
            this.toast.success(res.msg);
            this.resetTarget = null;
          } else {
            this.resetError = res.msg;
          }
        }
      );
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
  max-width: 440px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.35);
}
</style>
