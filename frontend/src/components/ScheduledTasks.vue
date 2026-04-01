<template>
  <div>
    <h6 class="text-muted mb-2">Scheduled Tasks</h6>
    <table v-if="tasks.length" class="table table-sm table-borderless align-middle mb-2"><thead><tr><th>Action</th><th>Cron</th><th>Enabled</th><th>Last Run</th><th></th></tr></thead><tbody><tr v-for="t in tasks" :key="t.id"><td><span class="badge bg-primary">{{ t.action }}</span></td><td><code>{{ t.cron }}</code></td><td><div class="form-check form-switch mb-0"><input class="form-check-input" type="checkbox" :checked="t.enabled" @change="toggleTask(t)" /></div></td><td class="text-muted" style="font-size:0.8em">{{ t.last_run ? new Date(t.last_run).toLocaleString() : 'Never' }}</td><td><button class="btn btn-sm btn-outline-danger py-0" @click="deleteTask(t.id)">Delete</button></td></tr></tbody></table>
    <p v-else class="text-muted" style="font-size:0.85em">No scheduled tasks.</p>
    <div class="d-flex gap-2 align-items-end flex-wrap mt-1"><div><label class="form-label mb-1" style="font-size:0.8em">Action</label><select v-model="newAction" class="form-select form-select-sm"><option value="start">Start</option><option value="stop">Stop</option><option value="restart">Restart</option><option value="pull">Pull &amp; Update</option></select></div><div><label class="form-label mb-1" style="font-size:0.8em">Cron</label><input v-model="newCron" class="form-control form-control-sm" placeholder="0 3 * * *" style="width:130px" /></div><button class="btn btn-sm btn-outline-primary" @click="addTask">Add</button></div>
    <p v-if="error" class="text-danger mt-1" style="font-size:0.85em">{{ error }}</p>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  name: "ScheduledTasks",
  props: { stackName: { type: String, required: true } },
  data() { return { tasks: [] as any[], newAction: "restart", newCron: "0 3 * * *", error: "" }; },
  mounted() { this.load(); },
  methods: {
    load() { this.$root?.getSocket().emit("getScheduledTasks", this.stackName, (res: any) => { if (res.ok) this.tasks = res.tasks; }); },
    addTask() { this.error = ""; this.$root?.getSocket().emit("createScheduledTask", { stackName: this.stackName, action: this.newAction, cron: this.newCron }, (res: any) => { if (res.ok) { this.load(); this.newCron = "0 3 * * *"; } else this.error = res.msg; }); },
    toggleTask(t: any) { this.$root?.getSocket().emit("updateScheduledTask", { id: t.id, enabled: !t.enabled }, (res: any) => { if (res.ok) t.enabled = !t.enabled; }); },
    deleteTask(id: number) { this.$root?.getSocket().emit("deleteScheduledTask", id, (res: any) => { if (res.ok) this.tasks = this.tasks.filter((t) => t.id !== id); }); },
  },
});
</script>
