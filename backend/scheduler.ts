import { Cron } from "croner";
import { R } from "redbean-node";
import { log } from "./log";
import { Stack } from "./stack";
import { DockgeServer } from "./dockge-server";

interface TaskRecord {
    id: number;
    stack_name: string;
    action: string;
    cron: string;
    enabled: boolean;
}

// Map of task id => Cron instance
const cronJobs = new Map<number, Cron>();

/**
 * Load all enabled tasks from DB and schedule them.
 * Safe to call multiple times — existing jobs are stopped first.
 */
export async function startScheduler(server: DockgeServer): Promise<void> {
    // Stop existing jobs
    for (const job of cronJobs.values()) job.stop();
    cronJobs.clear();

    const tasks = await R.knex("scheduled_task").where({ enabled: true }) as TaskRecord[];
    for (const task of tasks) {
        scheduleTask(server, task);
    }
    log.info("scheduler", `Scheduled ${tasks.length} task(s).`);
}

function scheduleTask(server: DockgeServer, task: TaskRecord): void {
    try {
        const job = new Cron(task.cron, { protect: true }, async () => {
            log.info("scheduler", `Running scheduled task #${task.id}: ${task.action} on ${task.stack_name}`);
            try {
                const stack = await Stack.getStack(server, task.stack_name);
                // Use a mock socket-like object (no real terminal output for scheduled tasks)
                const mockSocket = { endpoint: "", userID: 0, emit: () => {} } as any;
                if (task.action === "start")   await stack.start(mockSocket);
                if (task.action === "stop")    await stack.stop(mockSocket);
                if (task.action === "restart") await stack.restart(mockSocket);
                if (task.action === "pull")    await stack.update(mockSocket);
                await R.knex("scheduled_task").where({ id: task.id }).update({ last_run: new Date() });
                server.sendStackList();
            } catch (e) {
                log.error("scheduler", `Task #${task.id} failed: ` + e);
            }
        });
        cronJobs.set(task.id, job);
    } catch (e) {
        log.error("scheduler", `Failed to schedule task #${task.id} (cron: "${task.cron}"): ` + e);
    }
}

/** Reload scheduler after DB changes */
export async function reloadScheduler(server: DockgeServer): Promise<void> {
    await startScheduler(server);
}
