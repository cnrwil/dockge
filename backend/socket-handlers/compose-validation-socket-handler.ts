import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import childProcessAsync from "promisify-child-process";
import fs from "fs";
import path from "path";
import os from "os";

export class ComposeValidationSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {
        socket.on("validateCompose", async (composeYAML: string, callback) => {
            try {
                checkLogin(socket);
                if (typeof composeYAML !== "string") throw new Error("composeYAML must be a string.");
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dockge-validate-"));
                const tmpFile = path.join(tmpDir, "compose.yaml");
                try {
                    fs.writeFileSync(tmpFile, composeYAML);
                    const result = await childProcessAsync.spawn("docker", ["compose", "-f", tmpFile, "config", "--quiet"], { encoding: "utf-8", cwd: tmpDir });
                    const warnings = (result.stderr?.toString().trim() ?? "").split("\n").filter((l) => l.trim().length > 0).map((l) => l.trim());
                    callback({ ok: true, valid: true, warnings });
                } catch (spawnErr: any) {
                    const errors = (spawnErr.stderr?.toString() ?? spawnErr.message ?? "").split("\n").filter((l: string) => l.trim().length > 0).map((l: string) => l.trim());
                    callback({ ok: true, valid: false, errors });
                } finally {
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                }
            } catch (e) { callbackError(e, callback); }
        });
    }
}
