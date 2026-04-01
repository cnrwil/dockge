import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import childProcessAsync from "promisify-child-process";

function parseDockerStats(raw: string) {
    const results: any[] = [];
    for (const line of raw.split("\n")) {
        const trimmed = line.trim(); if (!trimmed) continue;
        try {
            const obj = JSON.parse(trimmed);
            const parseMB = (s: string) => { if (!s) return 0; const n = parseFloat(s); if (s.includes("GiB")) return n * 1024; if (s.includes("MiB")) return n; if (s.includes("kB") || s.includes("KiB")) return n / 1024; return n; };
            const parsePct = (s: string) => parseFloat(s?.replace("%", "") ?? "0") || 0;
            const [memUsed, memLimit] = (obj.MemUsage ?? "").split(" / ");
            const [netRx, netTx] = (obj.NetIO ?? "").split(" / ");
            const [blkR, blkW] = (obj.BlockIO ?? "").split(" / ");
            results.push({ name: obj.Name ?? "", cpuPct: parsePct(obj.CPUPerc), memUsageMB: parseMB(memUsed), memLimitMB: parseMB(memLimit), memPct: parsePct(obj.MemPerc), netRxMB: parseMB(netRx), netTxMB: parseMB(netTx), blockReadMB: parseMB(blkR), blockWriteMB: parseMB(blkW) });
        } catch { }
    }
    return results;
}

export class ResourceUsageSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {
        socket.on("getStackResourceUsage", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                const res = await childProcessAsync.spawn("docker", ["stats", "--no-stream", "--format", "{{json .}}"], { encoding: "utf-8" });
                const allStats = parseDockerStats(res.stdout?.toString() ?? "");
                const containers = allStats.filter((c) => c.name.startsWith(stackName + "-"));
                callback({ ok: true, stats: { stackName, containers, totalCpuPct: containers.reduce((s: number, c: any) => s + c.cpuPct, 0), totalMemUsageMB: containers.reduce((s: number, c: any) => s + c.memUsageMB, 0) } });
            } catch (e) { callbackError(e, callback); }
        });
        socket.on("getAllStackResourceUsage", async (callback) => {
            try {
                checkLogin(socket);
                const res = await childProcessAsync.spawn("docker", ["stats", "--no-stream", "--format", "{{json .}}"], { encoding: "utf-8" });
                const allStats = parseDockerStats(res.stdout?.toString() ?? "");
                const grouped: Record<string, any> = {};
                for (const c of allStats) {
                    const stackName = c.name.split("-")[0];
                    if (!grouped[stackName]) grouped[stackName] = { stackName, containers: [], totalCpuPct: 0, totalMemUsageMB: 0 };
                    grouped[stackName].containers.push(c); grouped[stackName].totalCpuPct += c.cpuPct; grouped[stackName].totalMemUsageMB += c.memUsageMB;
                }
                callback({ ok: true, stats: grouped });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
