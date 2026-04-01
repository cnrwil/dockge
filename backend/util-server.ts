import { Socket } from "socket.io";
import { Terminal } from "./terminal";
import { log } from "./log";
import { ERROR_TYPE_VALIDATION } from "../common/util-common";
import { R } from "redbean-node";
import { verifyPassword } from "./password-hash";
import fs from "fs";
import { AgentManager } from "./agent-manager";
import { UserRole, hasRole } from "../common/roles";

export interface JWTDecoded {
    username: string;
    h?: string;
    role?: UserRole;
}

export interface DockgeSocket extends Socket {
    userID: number;
    userRole: UserRole;
    consoleTerminal?: Terminal;
    instanceManager: AgentManager;
    endpoint: string;
    emitAgent: (eventName: string, ...args: unknown[]) => void;
}

export interface Arguments {
    sslKey?: string;
    sslCert?: string;
    sslKeyPassphrase?: string;
    port?: number;
    hostname?: string;
    dataDir?: string;
    stacksDir?: string;
    enableConsole?: boolean;
}

export interface Config extends Arguments {
    dataDir: string;
    stacksDir: string;
}

export function checkLogin(socket: DockgeSocket) {
    if (!socket.userID) throw new Error("You are not logged in.");
}

export function checkRole(socket: DockgeSocket, required: UserRole) {
    checkLogin(socket);
    if (!hasRole(socket.userRole ?? "viewer", required)) {
        throw new Error(`Permission denied. Required role: ${required}.`);
    }
}

export class ValidationError extends Error {
    constructor(message: string) { super(message); }
}

export function callbackError(error: unknown, callback: unknown) {
    if (typeof callback !== "function") { log.error("console", "Callback is not a function"); return; }
    if (error instanceof ValidationError) {
        callback({ ok: false, type: ERROR_TYPE_VALIDATION, msg: error.message, msgi18n: true });
    } else if (error instanceof Error) {
        callback({ ok: false, msg: error.message, msgi18n: true });
    } else {
        log.debug("console", "Unknown error: " + error);
    }
}

export function callbackResult(result: unknown, callback: unknown) {
    if (typeof callback !== "function") { log.error("console", "Callback is not a function"); return; }
    callback(result);
}

export async function doubleCheckPassword(socket: DockgeSocket, currentPassword: unknown) {
    if (typeof currentPassword !== "string") throw new Error("Wrong data type?");
    const user = await R.findOne("user", " id = ? AND active = 1 ", [socket.userID]);
    if (!user || !verifyPassword(currentPassword, user.password)) throw new Error("Incorrect current password");
    return user;
}

export function fileExists(file: string) {
    return fs.promises.access(file, fs.constants.F_OK).then(() => true).catch(() => false);
}
