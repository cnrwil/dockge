import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { Stack } from "../stack";
import fs from "fs";
import path from "path";
import archiver from "archiver";
import { PassThrough } from "stream";

export class StackBackupSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {
        socket.on("exportStack", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string" || stackName.trim() === "") throw new Error("Invalid stack name.");
                const stack = await Stack.getStack(server, stackName);
                const archive = archiver("zip", { zlib: { level: 9 } });
                const passThrough = new PassThrough();
                const chunks: Buffer[] = [];
                passThrough.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
                const zipReady = new Promise<void>((resolve, reject) => { passThrough.on("end", resolve); passThrough.on("error", reject); archive.on("error", reject); });
                archive.pipe(passThrough);
                const composeFile = path.join(stack.path, "compose.yaml");
                if (fs.existsSync(composeFile)) archive.file(composeFile, { name: "compose.yaml" });
                const envFile = path.join(stack.path, ".env");
                if (fs.existsSync(envFile)) archive.file(envFile, { name: ".env" });
                await archive.finalize(); await zipReady;
                callback({ ok: true, filename: `${stackName}-backup.zip`, data: Buffer.concat(chunks).toString("base64") });
            } catch (e) { callbackError(e, callback); }
        });
        socket.on("importStack", async (data: { stackName: string; zipBase64: string }, callback) => {
            try {
                checkLogin(socket);
                const { stackName, zipBase64 } = data;
                if (!stackName || typeof zipBase64 !== "string") throw new Error("Invalid import data.");
                const buf = Buffer.from(zipBase64, "base64");
                const tmpPath = path.join(server.config.dataDir, `_import_${stackName}_${Date.now()}.zip`);
                fs.writeFileSync(tmpPath, buf);
                const unzipper = await import("unzipper");
                const stackDir = path.join(server.stacksDir, stackName);
                if (!fs.existsSync(stackDir)) fs.mkdirSync(stackDir, { recursive: true });
                await new Promise<void>((resolve, reject) => { fs.createReadStream(tmpPath).pipe(unzipper.Extract({ path: stackDir })).on("close", resolve).on("error", reject); });
                fs.unlinkSync(tmpPath);
                server.sendStackList();
                callback({ ok: true, msg: `Stack "${stackName}" imported successfully.` });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
