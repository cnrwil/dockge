import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";
import { reloadScheduler } from "../scheduler";

const ALLOWED_ACTIONS = ["start", "stop", "restart", "pull"] as const;

export class ScheduledTasksSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        socket.on("getScheduledTasks", async (stackName: string | undefined, callback) => {
            try {
                checkLogin(socket);
                let q = R.knex("scheduled_task");
                if (stackName) q = q.where({ stack_name: stackName });
                const tasks = await q.select("id", "stack_name", "action", "cron", "enabled", "last_run", "next_run").orderBy("id");
                callback({ ok: true, tasks });
            } catch (e) { callbackError(e, callback); }
        });

        socket.on("createScheduledTask", async (data: { stackName: string; action: string; cron: string }, callback) => {
            try {
                checkLogin(socket);
                const { stackName, action, cron } = data;
                if (!ALLOWED_ACTIONS.includes(action as any)) throw new Error(`Invalid action. Must be one of: ${ALLOWED_ACTIONS.join(", ")}`);
                if (!cron || typeof cron !== "string") throw new Error("Invalid cron expression.");
                const [id] = await R.knex("scheduled_task").insert({ stack_name: stackName, action, cron, enabled: true });
                await reloadScheduler(server);
                callback({ ok: true, id });
            } catch (e) { callbackError(e, callback); }
        });

        socket.on("updateScheduledTask", async (data: { id: number; cron?: string; enabled?: boolean }, callback) => {
            try {
                checkLogin(socket);
                const updates: Record<string, unknown> = {};
                if (data.cron !== undefined) updates.cron = data.cron;
                if (data.enabled !== undefined) updates.enabled = data.enabled;
                await R.knex("scheduled_task").where({ id: data.id }).update(updates);
                await reloadScheduler(server);
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });

        socket.on("deleteScheduledTask", async (id: number, callback) => {
            try {
                checkLogin(socket);
                await R.knex("scheduled_task").where({ id }).delete();
                await reloadScheduler(server);
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
