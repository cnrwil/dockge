import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";
import { Stack } from "../stack";
import { RUNNING } from "../../common/util-common";

export class StackDependenciesSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /** Get dependencies for a stack */
        socket.on("getStackDependencies", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                const deps = await R.knex("stack_dependency")
                    .where({ stack_name: stackName })
                    .pluck("depends_on");
                callback({ ok: true, dependencies: deps });
            } catch (e) { callbackError(e, callback); }
        });

        /** Set (replace) the dependency list for a stack */
        socket.on("setStackDependencies", async (stackName: string, dependencies: string[], callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new Error("Invalid stack name.");

                // Prevent circular dependencies (simple 1-level check)
                for (const dep of dependencies) {
                    if (dep === stackName) throw new Error(`Stack "${stackName}" cannot depend on itself.`);
                    const reverse = await R.knex("stack_dependency")
                        .where({ stack_name: dep, depends_on: stackName })
                        .first();
                    if (reverse) throw new Error(`Circular dependency detected: "${dep}" already depends on "${stackName}".`);
                }

                await R.knex("stack_dependency").where({ stack_name: stackName }).delete();
                if (dependencies.length > 0) {
                    await R.knex("stack_dependency").insert(
                        dependencies.map((dep) => ({ stack_name: stackName, depends_on: dep }))
                    );
                }
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });

        /**
         * Start a stack, waiting for its declared dependencies to be RUNNING first.
         * Polls every 3 seconds, times out after 120 seconds.
         */
        socket.on("startStackWithDeps", async (stackName: string, callback) => {
            try {
                checkLogin(socket);

                const deps = await R.knex("stack_dependency")
                    .where({ stack_name: stackName })
                    .pluck("depends_on") as string[];

                if (deps.length > 0) {
                    const timeout = Date.now() + 120_000;
                    while (Date.now() < timeout) {
                        const stackList = await Stack.getStackList(server, false);
                        const allReady = deps.every((dep) => stackList.get(dep)?.["_status"] === RUNNING);
                        if (allReady) break;
                        socket.emit("depWaiting", { stackName, waiting: deps.filter((dep) => stackList.get(dep)?.["_status"] !== RUNNING) });
                        await new Promise((r) => setTimeout(r, 3000));
                    }
                }

                const stack = await Stack.getStack(server, stackName);
                await stack.start(socket);
                callback({ ok: true, msg: "Started" });
                server.sendStackList();
            } catch (e) { callbackError(e, callback); }
        });
    }
}
