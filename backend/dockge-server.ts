import "dotenv/config";
import { MainRouter } from "./routers/main-router";
import * as fs from "node:fs";
import { PackageJson } from "type-fest";
import { Database } from "./database";
import packageJSON from "../package.json";
import { log } from "./log";
import * as socketIO from "socket.io";
import express, { Express } from "express";
import { parse } from "ts-command-line-args";
import https from "https";
import http from "http";
import { Router } from "./router";
import { Socket } from "socket.io";
import { MainSocketHandler } from "./socket-handlers/main-socket-handler";
import { SocketHandler } from "./socket-handler";
import { Settings } from "./settings";
import checkVersion from "./check-version";
import dayjs from "dayjs";
import { R } from "redbean-node";
import { genSecret, isDev, LooseObject } from "../common/util-common";
import { generatePasswordHash } from "./password-hash";
import { Bean } from "redbean-node/dist/bean";
import { Arguments, Config, DockgeSocket } from "./util-server";
import { DockerSocketHandler } from "./agent-socket-handlers/docker-socket-handler";
import expressStaticGzip from "express-static-gzip";
import path from "path";
import { TerminalSocketHandler } from "./agent-socket-handlers/terminal-socket-handler";
import { Stack } from "./stack";
import { Cron } from "croner";
import gracefulShutdown from "http-graceful-shutdown";
import User from "./models/user";
import childProcessAsync from "promisify-child-process";
import { AgentManager } from "./agent-manager";
import { AgentProxySocketHandler } from "./socket-handlers/agent-proxy-socket-handler";
import { AgentSocketHandler } from "./agent-socket-handler";
import { AgentSocket } from "../common/agent-socket";
import { ManageAgentSocketHandler } from "./socket-handlers/manage-agent-socket-handler";
import { ComposeValidationSocketHandler } from "./socket-handlers/compose-validation-socket-handler";
import { Terminal } from "./terminal";

export class DockgeServer {
    app : Express; httpServer : http.Server; packageJSON : PackageJson; io : socketIO.Server; config : Config; indexHTML : string = "";
    routerList : Router[] = [ new MainRouter() ];
    socketHandlerList : SocketHandler[] = [ new MainSocketHandler(), new ManageAgentSocketHandler(), new ComposeValidationSocketHandler() ];
    agentProxySocketHandler = new AgentProxySocketHandler();
    agentSocketHandlerList : AgentSocketHandler[] = [ new DockerSocketHandler(), new TerminalSocketHandler() ];
    needSetup = false; jwtSecret : string = ""; stacksDir : string = "";
    constructor() {
        process.addListener("unhandledRejection", (e) => { console.trace(e); }); process.addListener("uncaughtException", (e) => { console.trace(e); });
        if (!process.env.NODE_ENV) process.env.NODE_ENV = "production";
        let defaultStacksDir = process.platform === "win32" ? "./stacks" : "/opt/stacks";
        let args = parse<Arguments>({ sslKey: { type: String, optional: true }, sslCert: { type: String, optional: true }, sslKeyPassphrase: { type: String, optional: true }, port: { type: Number, optional: true }, hostname: { type: String, optional: true }, dataDir: { type: String, optional: true }, stacksDir: { type: String, optional: true }, enableConsole: { type: Boolean, optional: true, defaultValue: false } });
        this.config = args as Config; this.config.sslKey = args.sslKey || process.env.DOCKGE_SSL_KEY || undefined; this.config.sslCert = args.sslCert || process.env.DOCKGE_SSL_CERT || undefined; this.config.sslKeyPassphrase = args.sslKeyPassphrase || process.env.DOCKGE_SSL_KEY_PASSPHRASE || undefined; this.config.port = args.port || Number(process.env.DOCKGE_PORT) || 5001; this.config.hostname = args.hostname || process.env.DOCKGE_HOSTNAME || undefined; this.config.dataDir = args.dataDir || process.env.DOCKGE_DATA_DIR || "./data/"; this.config.stacksDir = args.stacksDir || process.env.DOCKGE_STACKS_DIR || defaultStacksDir; this.config.enableConsole = args.enableConsole || process.env.DOCKGE_ENABLE_CONSOLE === "true" || false; this.stacksDir = this.config.stacksDir;
        this.packageJSON = packageJSON as PackageJson;
        try { this.indexHTML = fs.readFileSync("./frontend-dist/index.html").toString(); } catch (e) { if (process.env.NODE_ENV !== "development") { log.error("server", "Error: Cannot find 'frontend-dist/index.html'"); process.exit(1); } }
        this.app = express();
        this.httpServer = (this.config.sslKey && this.config.sslCert) ? https.createServer({ key: fs.readFileSync(this.config.sslKey), cert: fs.readFileSync(this.config.sslCert), passphrase: this.config.sslKeyPassphrase }, this.app) : http.createServer(this.app);
        for (const r of this.routerList) this.app.use(r.create(this.app, this));
        this.app.use("/", expressStaticGzip("frontend-dist", { enableBrotli: true })); this.app.get("*", async (_req, res) => { res.send(this.indexHTML); });
        this.io = new socketIO.Server(this.httpServer, { cors: isDev ? { origin: "*" } : undefined, allowRequest: (req, cb) => { let v = true; if (!(isDev || process.env.UPTIME_KUMA_WS_ORIGIN_CHECK === "bypass")) { let o = req.headers.origin; if (o) { try { if (req.headers.host !== new URL(o).host) v = false; } catch { v = false; } } } cb(null, v); } });
        this.io.on("connection", async (socket: Socket) => {
            let d = socket as DockgeSocket; d.instanceManager = new AgentManager(d); d.emitAgent = (event : string, ...args : unknown[]) => { let obj = args[0]; if (typeof obj === "object") (obj as LooseObject).endpoint = d.endpoint; d.emit("agent", event, ...args); };
            d.endpoint = typeof socket.request.headers.endpoint === "string" ? socket.request.headers.endpoint : "";
            this.sendInfo(d, true); if (this.needSetup) d.emit("setup");
            for (const sh of this.socketHandlerList) sh.create(d, this);
            let as = new AgentSocket(); for (const sh of this.agentSocketHandlerList) sh.create(d, this, as); this.agentProxySocketHandler.create2(d, this, as);
            if (await Settings.get("disableAuth")) { this.afterLogin(d, await R.findOne("user") as User); d.emit("autoLogin"); }
            d.on("disconnect", () => { d.instanceManager.disconnectAll(); });
        });
        this.io.on("disconnect", () => {});
        if (isDev) setInterval(() => { log.debug("terminal", "Terminal count: " + Terminal.getTerminalCount()); }, 5000);
    }
    async afterLogin(socket : DockgeSocket, user : User) { socket.userID = user.id; socket.join(user.id.toString()); this.sendInfo(socket); try { this.sendStackList(); } catch (e) { log.error("server", e); } socket.instanceManager.sendAgentList(); socket.instanceManager.connectAll(); }
    async serve() {
        this.initDataDir(); try { await Database.init(this); } catch (e) { if (e instanceof Error) log.error("server", "Failed to prepare your database: " + e.message); process.exit(1); }
        let jsb = await R.findOne("setting", " `key` = ? ", ["jwtSecret"]); if (!jsb) jsb = await this.initJWTSecret(); this.jwtSecret = jsb.value;
        const uc = (await R.knex("user").count("id as count").first()).count; if (uc == 0) this.needSetup = true;
        this.httpServer.listen(this.config.port, this.config.hostname, () => { Cron("*/10 * * * * *", { protect: true }, () => { this.sendStackList(true); }); checkVersion.startInterval(); });
        gracefulShutdown(this.httpServer, { signals: "SIGINT SIGTERM", timeout: 30000, development: false, forceExit: true, onShutdown: this.shutdownFunction, finally: this.finalFunction });
    }
    async sendInfo(socket : Socket, hideVersion = false) { let v, lv, ic; if (!hideVersion) { v = packageJSON.version; lv = checkVersion.latestVersion; ic = (process.env.DOCKGE_IS_CONTAINER === "1"); } socket.emit("info", { version: v, latestVersion: lv, isContainer: ic, primaryHostname: await Settings.get("primaryHostname") }); }
    async getClientIP(socket : Socket) : Promise<string> { let ip = socket.client.conn.remoteAddress ?? ""; if (await Settings.get("trustProxy")) { const ff = socket.client.conn.request.headers["x-forwarded-for"]; if (typeof ff === "string") return ff.split(",")[0].trim(); } return ip.replace(/^::ffff:/, ""); }
    async getTimezone() { try { if (process.env.TZ) { this.checkTimezone(process.env.TZ); return process.env.TZ; } } catch {} const tz = await Settings.get("serverTimezone"); try { if (tz) { this.checkTimezone(tz); return tz; } } catch {} try { const g = dayjs.tz.guess(); return g || "UTC"; } catch { return "UTC"; } }
    getTimezoneOffset() { return dayjs().format("Z"); }
    checkTimezone(tz : string) { try { dayjs.utc("2013-11-18 11:55").tz(tz).format(); } catch { throw new Error("Invalid timezone:" + tz); } }
    initDataDir() { if (!fs.existsSync(this.config.dataDir)) fs.mkdirSync(this.config.dataDir, { recursive: true }); if (!fs.lstatSync(this.config.dataDir).isDirectory()) throw new Error(`Fatal error: ${this.config.dataDir} is not a directory`); if (!fs.existsSync(this.stacksDir)) fs.mkdirSync(this.stacksDir, { recursive: true }); log.info("server", `Data Dir: ${this.config.dataDir}`); }
    async initJWTSecret() : Promise<Bean> { let b = await R.findOne("setting", " `key` = ? ", ["jwtSecret"]); if (!b) { b = R.dispense("setting"); b.key = "jwtSecret"; } b.value = generatePasswordHash(genSecret()); await R.store(b); return b; }
    async sendStackList(useCache = false) { let sl = this.io.sockets.sockets.values(); let stackList; for (let s of sl) { let d = s as DockgeSocket; if (d.userID) { if (!stackList) stackList = await Stack.getStackList(this, useCache); let map : Map<string, object> = new Map(); for (let [n, st] of stackList) map.set(n, st.toSimpleJSON(d.endpoint)); d.emitAgent("stackList", { ok: true, stackList: Object.fromEntries(map) }); } } }
    async getDockerNetworkList() : Promise<string[]> { let res = await childProcessAsync.spawn("docker", ["network", "ls", "--format", "{{.Name}}"], { encoding: "utf-8" }); if (!res.stdout) return []; return res.stdout.toString().split("\n").filter((i) => i !== "").sort((a, b) => a.localeCompare(b)); }
    get stackDirFullPath() { return path.resolve(this.stacksDir); }
    async shutdownFunction(signal : string | undefined) { log.info("server", "Shutdown requested"); await Database.close(); Settings.stopCacheCleaner(); }
    finalFunction() { log.info("server", "Graceful shutdown successful!"); }
    disconnectAllSocketClients(userID: number | undefined, currentSocketID? : string) { for (const rawSocket of this.io.sockets.sockets.values()) { let socket = rawSocket as DockgeSocket; if ((!userID || socket.userID === userID) && socket.id !== currentSocketID) { try { socket.emit("refresh"); socket.disconnect(); } catch {} } } }
    isSSL() { return this.config.sslKey && this.config.sslCert; }
    getLocalWebSocketURL() { return `${this.isSSL() ? "wss" : "ws"}://${this.config.hostname || "localhost"}:${this.config.port}`; }
}
