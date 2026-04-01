import { SocketHandler } from "../socket-handler.js";
import { DockgeServer } from "../dockge-server";
import { checkRole, callbackError, DockgeSocket } from "../util-server";
import { R } from "redbean-node";
import { generatePasswordHash } from "../password-hash";
import { passwordStrength } from "check-password-strength";
import { UserRole, ROLE_LABELS } from "../../common/roles";
import { User } from "../models/user";

export class UserManagementSocketHandler extends SocketHandler {
    create(socket: DockgeSocket, server: DockgeServer) {

        /**
         * List all users. Admin only.
         */
        socket.on("admin:getUsers", async (callback) => {
            try {
                checkRole(socket, "admin");
                const users = await R.findAll("user", " ORDER BY id ASC ");
                callback({
                    ok: true,
                    users: users.map((u) => ({
                        id: u.id,
                        username: u.username,
                        role: u.role ?? "operator",
                        active: u.active,
                    })),
                });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        /**
         * Create a new user. Admin only.
         */
        socket.on("admin:createUser", async (data, callback) => {
            try {
                checkRole(socket, "admin");

                const { username, password, role } = data as { username: string; password: string; role: UserRole };

                if (!username || typeof username !== "string") {
                    throw new Error("Invalid username.");
                }
                if (passwordStrength(password).value === "Too weak") {
                    throw new Error("Password is too weak. Use at least 6 characters with letters and numbers.");
                }
                if (!ROLE_LABELS[role]) {
                    throw new Error("Invalid role.");
                }

                const existing = await R.findOne("user", " username = ? ", [username]);
                if (existing) {
                    throw new Error(`Username "${username}" is already taken.`);
                }

                const user = R.dispense("user") as User;
                user.username = username;
                user.password = generatePasswordHash(password);
                user.role = role;
                user.active = true;
                await R.store(user);

                callback({ ok: true, msg: `User "${username}" created.` });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        /**
         * Update a user's role or active status. Admin only.
         * An admin cannot demote or deactivate themselves.
         */
        socket.on("admin:updateUser", async (data, callback) => {
            try {
                checkRole(socket, "admin");

                const { id, role, active } = data as { id: number; role?: UserRole; active?: boolean };

                if (id === socket.userID && (role !== "admin" || active === false)) {
                    throw new Error("You cannot demote or deactivate your own account.");
                }

                const user = await R.findOne("user", " id = ? ", [id]) as User;
                if (!user) {
                    throw new Error("User not found.");
                }

                if (role !== undefined) {
                    if (!ROLE_LABELS[role]) throw new Error("Invalid role.");
                    user.role = role;
                }
                if (active !== undefined) {
                    user.active = active;
                }

                await R.store(user);

                // Force-disconnect the updated user so their JWT role reloads
                if (role !== undefined || active === false) {
                    server.disconnectAllSocketClients(user.id);
                }

                callback({ ok: true, msg: "User updated." });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        /**
         * Delete a user. Admin only. Cannot delete yourself.
         */
        socket.on("admin:deleteUser", async (id: number, callback) => {
            try {
                checkRole(socket, "admin");

                if (id === socket.userID) {
                    throw new Error("You cannot delete your own account.");
                }

                const user = await R.findOne("user", " id = ? ", [id]);
                if (!user) {
                    throw new Error("User not found.");
                }

                server.disconnectAllSocketClients(user.id);
                await R.trash(user);

                callback({ ok: true, msg: "User deleted." });
            } catch (e) {
                callbackError(e, callback);
            }
        });

        /**
         * Reset another user's password. Admin only.
         */
        socket.on("admin:resetUserPassword", async (data, callback) => {
            try {
                checkRole(socket, "admin");

                const { id, newPassword } = data as { id: number; newPassword: string };

                if (passwordStrength(newPassword).value === "Too weak") {
                    throw new Error("Password is too weak.");
                }

                const user = await R.findOne("user", " id = ? ", [id]);
                if (!user) throw new Error("User not found.");

                await User.resetPassword(id, newPassword);
                server.disconnectAllSocketClients(id);

                callback({ ok: true, msg: "Password reset." });
            } catch (e) {
                callbackError(e, callback);
            }
        });
    }
}
