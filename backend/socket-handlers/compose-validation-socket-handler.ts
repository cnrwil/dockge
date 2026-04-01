import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import childProcessAsync from "promisify-child-process";
import fs from "fs";
import path from "path";
import os from "os";

export class ComposeValidationSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /**
         * Validate a compose YAML string by running `docker compose config`
         * against a temporary directory. Returns structured errors/warnings.
         */
        socket.on("validateCompose", async (composeYAML: string, callback) => {
            try {
                checkLogin(socket);

                if (typeof composeYAML !== "string") throw new Error("composeYAML must be a string.");

                // Write to a temp directory so docker compose can parse it
                const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "dockge-validate-"));
                const tmpFile = path.join(tmpDir, "compose.yaml");

                try {
                    fs.writeFileSync(tmpFile, composeYAML);

                    const result = await childProcessAsync.spawn(
                        "docker",
                        ["compose", "-f", tmpFile, "config", "--quiet"],
                        { encoding: "utf-8", cwd: tmpDir }
                    );

                    const stderr = result.stderr?.toString().trim() ?? "";
                    const warnings = stderr
                        .split("\n")
                        .filter((l) => l.trim().length > 0)
                        .map((l) => l.trim());

                    callback({
                        ok: true,
                        valid: true,
                        warnings,
                    });

                } catch (spawnErr: any) {
                    // docker compose config returns non-zero on invalid YAML
                    const stderr: string = spawnErr.stderr?.toString() ?? spawnErr.message ?? "Unknown error";

                    // Parse errors from stderr into structured messages
                    const errors = stderr
                        .split("\n")
                        .filter((l) => l.trim().length > 0)
                        .map((l) => l.trim());

                    callback({
                        ok: true,
                        valid: false,
                        errors,
                    });
                } finally {
                    fs.rmSync(tmpDir, { recursive: true, force: true });
                }

            } catch (e) { callbackError(e, callback); }
        });
    }
}
