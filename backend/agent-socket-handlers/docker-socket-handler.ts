import { AgentSocketHandler } from "../agent-socket-handler";
import { DockgeServer } from "../dockge-server";
import { callbackError, callbackResult, checkLogin, DockgeSocket, ValidationError } from "../util-server";
import { Stack } from "../stack";
import { AgentSocket } from "../../common/agent-socket";
import { auditSocket } from "../audit";
import { AuditAction } from "../audit-actions";

export class DockerSocketHandler extends AgentSocketHandler {
    create(socket : DockgeSocket, server : DockgeServer, agentSocket : AgentSocket) {

        agentSocket.on("deployStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                const stack = await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await stack.deploy(socket);
                server.sendStackList();
                await auditSocket(socket, isAdd ? AuditAction.STACK_CREATE : AuditAction.STACK_EDIT, typeof name === "string" ? name : undefined);
                callbackResult({ ok: true, msg: "Deployed", msgi18n: true }, callback);
                stack.joinCombinedTerminal(socket);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("saveStack", async (name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown, callback) => {
            try {
                checkLogin(socket);
                await this.saveStack(server, name, composeYAML, composeENV, isAdd);
                await auditSocket(socket, isAdd ? AuditAction.STACK_CREATE : AuditAction.STACK_EDIT, typeof name === "string" ? name : undefined);
                callbackResult({ ok: true, msg: "Saved", msgi18n: true }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("deleteStack", async (name : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof name !== "string") throw new ValidationError("Name must be a string");
                const stack = await Stack.getStack(server, name);
                try {
                    await stack.delete(socket);
                } catch (e) {
                    server.sendStackList();
                    throw e;
                }
                await auditSocket(socket, AuditAction.STACK_DELETE, name);
                server.sendStackList();
                callbackResult({ ok: true, msg: "Deleted", msgi18n: true }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("getStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                if (stack.isManagedByDockge) stack.joinCombinedTerminal(socket);
                callbackResult({ ok: true, stack: await stack.toJSON(socket.endpoint) }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("requestStackList", async (callback) => {
            try {
                checkLogin(socket);
                server.sendStackList();
                callbackResult({ ok: true, msg: "Updated", msgi18n: true }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("startStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                await stack.start(socket);
                await auditSocket(socket, AuditAction.STACK_START, stackName);
                callbackResult({ ok: true, msg: "Started", msgi18n: true }, callback);
                server.sendStackList();
                stack.joinCombinedTerminal(socket);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("stopStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                await stack.stop(socket);
                await auditSocket(socket, AuditAction.STACK_STOP, stackName);
                callbackResult({ ok: true, msg: "Stopped", msgi18n: true }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("restartStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                await stack.restart(socket);
                await auditSocket(socket, AuditAction.STACK_RESTART, stackName);
                callbackResult({ ok: true, msg: "Restarted", msgi18n: true }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("updateStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                await stack.update(socket);
                await auditSocket(socket, AuditAction.STACK_UPDATE_IMAGES, stackName);
                callbackResult({ ok: true, msg: "Updated", msgi18n: true }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("downStack", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName);
                await stack.down(socket);
                await auditSocket(socket, AuditAction.STACK_STOP, stackName);
                callbackResult({ ok: true, msg: "Downed", msgi18n: true }, callback);
                server.sendStackList();
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("serviceStatusList", async (stackName : unknown, callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new ValidationError("Stack name must be a string");
                const stack = await Stack.getStack(server, stackName, true);
                const serviceStatusList = Object.fromEntries(await stack.getServiceStatusList());
                callbackResult({ ok: true, serviceStatusList }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });

        agentSocket.on("getDockerNetworkList", async (callback) => {
            try {
                checkLogin(socket);
                const dockerNetworkList = await server.getDockerNetworkList();
                callbackResult({ ok: true, dockerNetworkList }, callback);
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }

    async saveStack(server : DockgeServer, name : unknown, composeYAML : unknown, composeENV : unknown, isAdd : unknown) : Promise<Stack> {
        if (typeof name !== "string") throw new ValidationError("Name must be a string");
        if (typeof composeYAML !== "string") throw new ValidationError("Compose YAML must be a string");
        if (typeof composeENV !== "string") throw new ValidationError("Compose ENV must be a string");
        if (typeof isAdd !== "boolean") throw new ValidationError("isAdd must be a boolean");
        const stack = new Stack(server, name, composeYAML, composeENV, false);
        await stack.save(isAdd);
        return stack;
    }
}
