import { R } from "redbean-node";
import { log } from "./log";
import { DockgeSocket } from "./util-server";

export interface AuditOptions {
    userID?: number | null;
    username?: string;
    action: string;
    target?: string;
    detail?: Record<string, unknown>;
    ip?: string;
}

export async function audit(opts: AuditOptions): Promise<void> {
    try {
        await R.knex("audit_log").insert({
            user_id: opts.userID ?? null,
            username: opts.username ?? "system",
            action: opts.action,
            target: opts.target ?? null,
            detail: opts.detail ? JSON.stringify(opts.detail) : null,
            ip: opts.ip ?? null,
            created_at: new Date(),
        });
    } catch (e) {
        log.error("audit", "Failed to write audit log entry: " + e);
    }
}

export async function auditSocket(
    socket: DockgeSocket,
    action: string,
    target?: string,
    detail?: Record<string, unknown>
): Promise<void> {
    await audit({
        userID: socket.userID ?? null,
        username: (socket as any).username ?? "unknown",
        action,
        target,
        detail,
        ip: socket.handshake?.address ?? undefined,
    });
}
