import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { Stack } from "../stack";
import childProcessAsync from "promisify-child-process";
import path from "path";

interface ContainerStats {
    name: string;
    cpuPct: number;
    memUsageMB: number;
    memLimitMB: number;
    memPct: number;
    netRxMB: number;
    netTxMB: number;
}

const parseMB = (s: string): number => {
    if (!s || s === "0B" || s === "--") return 0;
    const n = parseFloat(s);
    if (isNaN(n)) return 0;
    if (s.includes("GiB") || s.includes("GB")) return n * 1024;
    if (s.includes("MiB") || s.includes("MB")) return n;
    if (s.includes("KiB") || s.includes("kB") || s.includes("KB")) return n / 1024;
    return n;
};

const parsePct = (s: string): number =>
    parseFloat((s ?? "0").replace("%", "")) || 0;

/**
 * Get stats for a specific list of container names using `docker stats`.
 */
async function getStatsForContainers(containerNames: string[]): Promise<ContainerStats[]> {
    if (containerNames.length === 0) return [];

    const res = await childProcessAsync.spawn(
        "docker",
        [
            "stats", "--no-stream",
            "--format", "{\"Name\":\"{{.Name}}\",\"CPUPerc\":\"{{.CPUPerc}}\",\"MemUsage\":\"{{.MemUsage}}\",\"MemPerc\":\"{{.MemPerc}}\",\"NetIO\":\"{{.NetIO}}\"}",
            ...containerNames,
        ],
        { encoding: "utf-8" }
    );

    const results: ContainerStats[] = [];
    for (const line of (res.stdout?.toString() ?? "").split("\n")) {
        const t = line.trim();
        if (!t) continue;
        try {
            const obj = JSON.parse(t);
            const memParts = (obj.MemUsage ?? "").split(" / ");
            const netParts = (obj.NetIO ?? "").split(" / ");
            results.push({
                name: obj.Name ?? "",
                cpuPct: parsePct(obj.CPUPerc),
                memUsageMB: parseMB(memParts[0]),
                memLimitMB: parseMB(memParts[1]),
                memPct: parsePct(obj.MemPerc),
                netRxMB: parseMB(netParts[0]),
                netTxMB: parseMB(netParts[1]),
            });
        } catch { /* skip */ }
    }
    return results;
}

/**
 * Use `docker compose ps --format json` inside the stack directory to get
 * the actual container names for a stack — handles container_name overrides.
 */
async function getContainerNamesForStack(stackPath: string): Promise<string[]> {
    try {
        const res = await childProcessAsync.spawn(
            "docker",
            ["compose", "ps", "--format", "json"],
            { encoding: "utf-8", cwd: stackPath }
        );

        const names: string[] = [];
        const stdout = res.stdout?.toString() ?? "";

        // docker compose ps --format json outputs one JSON object per line
        for (const line of stdout.split("\n")) {
            const t = line.trim();
            if (!t) continue;
            try {
                const obj = JSON.parse(t);
                if (obj.Name) names.push(obj.Name);
            } catch { /* skip */ }
        }

        return names;
    } catch {
        return [];
    }
}

export class ResourceUsageSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        socket.on("getStackResourceUsage", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new Error("Invalid stack name.");

                const stackPath = path.join(server.stacksDir, stackName);

                // Get actual container names from docker compose - handles container_name overrides
                const containerNames = await getContainerNamesForStack(stackPath);

                if (containerNames.length === 0) {
                    callback({ ok: true, stats: { stackName, containers: [], totalCpuPct: 0, totalMemUsageMB: 0 } });
                    return;
                }

                const containers = await getStatsForContainers(containerNames);

                callback({
                    ok: true,
                    stats: {
                        stackName,
                        containers,
                        totalCpuPct: containers.reduce((s, c) => s + c.cpuPct, 0),
                        totalMemUsageMB: containers.reduce((s, c) => s + c.memUsageMB, 0),
                    },
                });
            } catch (e) { callbackError(e, callback); }
        });

        socket.on("getAllStackResourceUsage", async (callback) => {
            try {
                checkLogin(socket);

                const stackList = await Stack.getStackList(server, true);
                const grouped: Record<string, any> = {};

                for (const [stackName, stack] of stackList) {
                    if (!stack.isManagedByDockge) continue;
                    const stackPath = path.join(server.stacksDir, stackName);
                    const containerNames = await getContainerNamesForStack(stackPath);
                    if (containerNames.length === 0) continue;
                    const containers = await getStatsForContainers(containerNames);
                    grouped[stackName] = {
                        stackName,
                        containers,
                        totalCpuPct: containers.reduce((s, c) => s + c.cpuPct, 0),
                        totalMemUsageMB: containers.reduce((s, c) => s + c.memUsageMB, 0),
                    };
                }

                callback({ ok: true, stats: grouped });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
