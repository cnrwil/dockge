import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";

const MAX_HISTORY = 20;

export class ComposeHistorySocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {
        socket.on("saveComposeSnapshot", async (data: { stackName: string; composeYaml: string }, callback) => {
            try {
                checkLogin(socket);
                const { stackName, composeYaml } = data;
                if (!stackName || typeof composeYaml !== "string") throw new Error("Invalid data.");
                await R.knex("compose_history").insert({ stack_name: stackName, compose_yaml: composeYaml, saved_by: socket.userID ?? null, saved_by_username: (socket as any).username ?? "unknown", saved_at: new Date() });
                const ids = await R.knex("compose_history").where({ stack_name: stackName }).orderBy("saved_at", "desc").pluck("id") as number[];
                if (ids.length > MAX_HISTORY) await R.knex("compose_history").whereIn("id", ids.slice(MAX_HISTORY)).delete();
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });
        socket.on("getComposeHistory", async (stackName: string, callback) => {
            try { checkLogin(socket); const history = await R.knex("compose_history").where({ stack_name: stackName }).orderBy("saved_at", "desc").select("id", "saved_by_username", "saved_at"); callback({ ok: true, history }); } catch (e) { callbackError(e, callback); }
        });
        socket.on("getComposeHistoryEntry", async (id: number, callback) => {
            try { checkLogin(socket); const entry = await R.knex("compose_history").where({ id }).first(); if (!entry) throw new Error("History entry not found."); callback({ ok: true, entry }); } catch (e) { callbackError(e, callback); }
        });
        socket.on("restoreComposeSnapshot", async (data: { stackName: string; historyId: number }, callback) => {
            try { checkLogin(socket); const entry = await R.knex("compose_history").where({ id: data.historyId }).first(); if (!entry || entry.stack_name !== data.stackName) throw new Error("History entry not found."); callback({ ok: true, composeYaml: entry.compose_yaml }); } catch (e) { callbackError(e, callback); }
        });
    }
}
