import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkRole, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";

const PAGE_SIZE = 50;

export class AuditLogSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /**
         * Fetch a page of audit log entries. Admin only.
         *
         * Emits: { ok, entries, total, page }
         */
        socket.on("admin:getAuditLog", async (opts: { page?: number; action?: string; username?: string }, callback) => {
            try {
                checkRole(socket, "admin");

                const page = Math.max(1, opts?.page ?? 1);
                const offset = (page - 1) * PAGE_SIZE;

                let query = R.knex("audit_log");
                let countQuery = R.knex("audit_log");

                if (opts?.action) {
                    query = query.where("action", "like", `${opts.action}%`);
                    countQuery = countQuery.where("action", "like", `${opts.action}%`);
                }
                if (opts?.username) {
                    query = query.where("username", "like", `%${opts.username}%`);
                    countQuery = countQuery.where("username", "like", `%${opts.username}%`);
                }

                const [{ count }] = await countQuery.count("id as count");
                const entries = await query
                    .orderBy("created_at", "desc")
                    .limit(PAGE_SIZE)
                    .offset(offset)
                    .select("id", "username", "action", "target", "detail", "ip", "created_at");

                callback({
                    ok: true,
                    entries,
                    total: Number(count),
                    page,
                    pageSize: PAGE_SIZE,
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        /**
         * Clear all audit log entries older than N days. Admin only.
         */
        socket.on("admin:pruneAuditLog", async (days: number, callback) => {
            try {
                checkRole(socket, "admin");

                if (typeof days !== "number" || days < 1) {
                    throw new Error("Invalid retention period.");
                }

                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - days);

                const deleted = await R.knex("audit_log")
                    .where("created_at", "<", cutoff)
                    .delete();

                callback({ ok: true, msg: `Deleted ${deleted} entries older than ${days} days.` });
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
