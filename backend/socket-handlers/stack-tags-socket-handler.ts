import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkLogin, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";

export class StackTagsSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /** Get all tags for a stack */
        socket.on("getStackTags", async (stackName: string, callback) => {
            try {
                checkLogin(socket);
                const tags = await R.knex("stack_tag").where({ stack_name: stackName }).select("tag", "color");
                callback({ ok: true, tags });
            } catch (e) { callbackError(e, callback); }
        });

        /** Get all stacks grouped by tag — used to build the sidebar groups */
        socket.on("getAllStackTags", async (callback) => {
            try {
                checkLogin(socket);
                const rows = await R.knex("stack_tag").select("stack_name", "tag", "color").orderBy("tag");
                // Build { tagName: [{ stackName, color }] }
                const grouped: Record<string, { stackName: string; color: string }[]> = {};
                for (const row of rows) {
                    if (!grouped[row.tag]) grouped[row.tag] = [];
                    grouped[row.tag].push({ stackName: row.stack_name, color: row.color });
                }
                callback({ ok: true, grouped });
            } catch (e) { callbackError(e, callback); }
        });

        /** Set (replace) the full tag list for a stack */
        socket.on("setStackTags", async (stackName: string, tags: { tag: string; color: string }[], callback) => {
            try {
                checkLogin(socket);
                if (typeof stackName !== "string") throw new Error("Invalid stack name.");
                // Validate tags
                for (const t of tags) {
                    if (typeof t.tag !== "string" || t.tag.trim() === "") throw new Error("Tag name cannot be empty.");
                    if (t.tag.length > 64) throw new Error(`Tag "${t.tag}" is too long (max 64 chars).`);
                }
                await R.knex("stack_tag").where({ stack_name: stackName }).delete();
                if (tags.length > 0) {
                    await R.knex("stack_tag").insert(
                        tags.map((t) => ({ stack_name: stackName, tag: t.tag.trim(), color: t.color || "#6c757d" }))
                    );
                }
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });

        /** Delete a specific tag from a stack */
        socket.on("removeStackTag", async (stackName: string, tag: string, callback) => {
            try {
                checkLogin(socket);
                await R.knex("stack_tag").where({ stack_name: stackName, tag }).delete();
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });

        /** Rename a tag across all stacks */
        socket.on("renameTag", async (oldTag: string, newTag: string, callback) => {
            try {
                checkLogin(socket);
                if (!newTag || typeof newTag !== "string" || newTag.trim() === "") throw new Error("New tag name is invalid.");
                await R.knex("stack_tag").where({ tag: oldTag }).update({ tag: newTag.trim() });
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });

        /** Delete a tag from every stack */
        socket.on("deleteTag", async (tag: string, callback) => {
            try {
                checkLogin(socket);
                await R.knex("stack_tag").where({ tag }).delete();
                callback({ ok: true });
            } catch (e) { callbackError(e, callback); }
        });
    }
}
