import jwt from "jsonwebtoken";
import { R } from "redbean-node";
import { BeanModel } from "redbean-node/dist/bean-model";
import { generatePasswordHash, shake256, SHAKE256_LENGTH } from "../password-hash";
import { UserRole, hasRole } from "../../common/roles";

export class User extends BeanModel {
    /**
     * The user's role: 'admin' | 'operator' | 'viewer'
     */
    declare role: UserRole;

    /**
     * Reset user password
     */
    static async resetPassword(userID: number, newPassword: string) {
        await R.exec("UPDATE `user` SET password = ? WHERE id = ? ", [
            generatePasswordHash(newPassword),
            userID
        ]);
    }

    async resetPassword(newPassword: string) {
        await User.resetPassword(this.id, newPassword);
        this.password = newPassword;
    }

    /**
     * Returns true if this user has at least the given role level.
     */
    hasRole(required: UserRole): boolean {
        return hasRole(this.role ?? "viewer", required);
    }

    /**
     * Create a new JWT for a user
     */
    static createJWT(user: User, jwtSecret: string) {
        return jwt.sign({
            username: user.username,
            h: shake256(user.password, SHAKE256_LENGTH),
            role: user.role ?? "operator",
        }, jwtSecret);
    }
}

export default User;
