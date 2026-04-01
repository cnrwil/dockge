import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import childProcessAsync from "promisify-child-process";

interface ContainerStats {
    name: string;
    cpuPct: number;
    memUsageMB: number;
    memLimitMB: number;
    memPct: number;
    netRxMB: number;
    netTxMB: number;
    blockReadMB: number;
    blockWriteMB: number;
}

interface StackStats {
    stackName: string;
    containers: ContainerStats[];
    totalCpuPct: number;
    totalMemUsageMB: number;
}

/** Parse docker stats --no-stream --format json output */
function parseDockerStats(raw: string): ContainerStats[] {
    const results: ContainerStats[] = [];
    for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
            const obj = JSON.parse(trimmed);
            const parseMB = (s: string) => {
                if (!s) return 0;
                const n = parseFloat(s);
                if (s.includes("GiB")) return n * 1024;
                if (s.includes("MiB")) return n;
                if (s.includes("kB") || s.includes("KiB")) return n / 1024;
                return n;
            };
            const parsePct = (s: string) => parseFloat(s?.replace("%", "") ?? "0") || 0;
            const [memUsed, memLimit] = (obj.MemUsage ?? "").split(" / ");
            const [netRx, netTx] = (obj.NetIO ?? "").split(" / ");
            const [blkR, blkW] = (obj.BlockIO ?? "").split(" / ");
            results.push({
                name: obj.Name ?? "",
                cpuPct: parsePct(obj.CPUPerc),
                memUsageMB: parseMB(memUsed),
                memLimitMB: parseMB(memLimit),
                memPct: parsePct(obj.MemPerc),
                netRxMB: parseMB(netRx),
                netTxMB: parseMB(netTx),
                blockReadMB: parseMB(blkR),
                blockWriteMB: parseMB(blkW),
            });
        } catch { /* skip malformed lines */ }
    }
    return results;
}

export class ResourceUsageSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /**
         * Get resource usage for all containers of a specific stack.
         * Container names in docker compose follow the pattern: <stackName>-<service>-<n>
         */
        socket.on("getStackResourceUsage", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new Error("Invalid stack name.");

                const res = await childProcessAsync.spawn(
                    "docker",
                    ["stats", "--no-stream", "--format", "{{json .}}"],
                    { encoding: "utf-8" }
                );

                const allStats = parseDockerStats(res.stdout?.toString() ?? "");

                // Filter to this stack's containers (name starts with stackName-)
                const prefix = stackName + "-";
                const containers = allStats.filter((c) => c.name.startsWith(prefix));

                const result: StackStats = {
                    stackName,
                    containers,
                    totalCpuPct: containers.reduce((s, c) => s + c.cpuPct, 0),
                    totalMemUsageMB: containers.reduce((s, c) => s + c.memUsageMB, 0),
                };

                callback({ ok: true, stats: result });
            } catch (e) { callbackError(e, callback); }
        });

        /**
         * Get a summarised resource snapshot for ALL stacks at once.
         * Used by the main dashboard overview.
         */
        socket.on("getAllStackResourceUsage", async (callback) => {
            try {
                checkLogin(socket);

                const res = await childProcessAsync.spawn(
                    "docker",
                    ["stats", "--no-stream", "--format", "{{json .}}"],
                    { encoding: "utf-8" }
                );

                const allStats = parseDockerStats(res.stdout?.toString() ?? "");

                // Group by stack name (everything before the second "-")
                const grouped: Record<string, StackStats> = {};
                for (const c of allStats) {
                    // Container name pattern: <stack>-<service>-<index>
                    const parts = c.name.split("-");
                    const stackName = parts.length >= 2 ? parts[0] : c.name;
                    if (!grouped[stackName]) {
                        grouped[stackName] = { stackName, containers: [], totalCpuPct: 0, totalMemUsageMB: 0 };
                    }
                    grouped[stackName].containers.push(c);
                    grouped[stackName].totalCpuPct += c.cpuPct;
                    grouped[stackName].totalMemUsageMB += c.memUsageMB;
                }

                callback({ ok: true, stats: grouped });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
