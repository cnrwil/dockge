import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import childProcessAsync from "promisify-child-process";

function parseDockerStats(raw: string) {
    const results: any[] = [];
    for (const line of raw.split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
            const obj = JSON.parse(t);

            // Parse values like "1.23GiB", "456MiB", "789kB" into MB
            const parseMB = (s: string): number => {
                if (!s || s === "0B") return 0;
                const n = parseFloat(s);
                if (isNaN(n)) return 0;
                if (s.includes("GiB") || s.includes("GB")) return n * 1024;
                if (s.includes("MiB") || s.includes("MB")) return n;
                if (s.includes("KiB") || s.includes("kB") || s.includes("KB")) return n / 1024;
                return n;
            };

            const parsePct = (s: string): number =>
                parseFloat((s ?? "0").replace("%", "")) || 0;

            // MemUsage format: "123MiB / 1GiB"
            const memParts = (obj.MemUsage ?? "").split(" / ");
            // NetIO format: "1kB / 2kB"
            const netParts = (obj.NetIO ?? "").split(" / ");
            // BlockIO format: "0B / 0B"
            const blkParts = (obj.BlockIO ?? "").split(" / ");

            results.push({
                name: obj.Name ?? "",
                cpuPct: parsePct(obj.CPUPerc),
                memUsageMB: parseMB(memParts[0]),
                memLimitMB: parseMB(memParts[1]),
                memPct: parsePct(obj.MemPerc),
                netRxMB: parseMB(netParts[0]),
                netTxMB: parseMB(netParts[1]),
                blockReadMB: parseMB(blkParts[0]),
                blockWriteMB: parseMB(blkParts[1]),
            });
        } catch { /* skip malformed lines */ }
    }
    return results;
}

export class ResourceUsageSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        socket.on("getStackResourceUsage", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new Error("Invalid stack name.");

                // Use --format with table-style JSON output, one object per line
                const res = await childProcessAsync.spawn(
                    "docker",
                    ["stats", "--no-stream", "--format",
                     "{\"Name\":\"{{.Name}}\",\"CPUPerc\":\"{{.CPUPerc}}\",\"MemUsage\":\"{{.MemUsage}}\",\"MemPerc\":\"{{.MemPerc}}\",\"NetIO\":\"{{.NetIO}}\",\"BlockIO\":\"{{.BlockIO}}\"}"],
                    { encoding: "utf-8" }
                );

                const allStats = parseDockerStats(res.stdout?.toString() ?? "");

                // Docker Compose names containers: <stack>-<service>-<n>
                // Match by prefix stackName + "-"
                const containers = allStats.filter((c) =>
                    c.name === stackName ||
                    c.name.startsWith(stackName + "-") ||
                    c.name.startsWith(stackName + "_")
                );

                callback({
                    ok: true,
                    stats: {
                        stackName,
                        containers,
                        totalCpuPct: containers.reduce((s: number, c: any) => s + c.cpuPct, 0),
                        totalMemUsageMB: containers.reduce((s: number, c: any) => s + c.memUsageMB, 0),
                    },
                });
            } catch (e) { callbackError(e, callback); }
        });

        socket.on("getAllStackResourceUsage", async (callback) => {
            try {
                checkLogin(socket);

                const res = await childProcessAsync.spawn(
                    "docker",
                    ["stats", "--no-stream", "--format",
                     "{\"Name\":\"{{.Name}}\",\"CPUPerc\":\"{{.CPUPerc}}\",\"MemUsage\":\"{{.MemUsage}}\",\"MemPerc\":\"{{.MemPerc}}\",\"NetIO\":\"{{.NetIO}}\",\"BlockIO\":\"{{.BlockIO}}\"}"],
                    { encoding: "utf-8" }
                );

                const allStats = parseDockerStats(res.stdout?.toString() ?? "");

                // Group by stack name: containers named <stack>-<service>-<n>
                const grouped: Record<string, any> = {};
                for (const c of allStats) {
                    // Extract stack name from container name
                    const parts = c.name.split("-");
                    const stackName = parts.length >= 2 ? parts.slice(0, -2).join("-") || parts[0] : c.name;
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
