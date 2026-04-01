/**
 * Role definitions and permission helpers shared between frontend and backend.
 */

export type UserRole = "admin" | "operator" | "viewer";

/** Ordered from least to most privileged */
const ROLE_HIERARCHY: UserRole[] = ["viewer", "operator", "admin"];

/**
 * Returns true if `role` has at least the permissions of `required`.
 */
export function hasRole(role: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(required);
}

/** Human-readable label for each role */
export const ROLE_LABELS: Record<UserRole, string> = {
    admin: "Admin",
    operator: "Operator",
    viewer: "Viewer",
};

/** Permissions matrix */
export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    viewer: [
        "viewStacks",
        "viewLogs",
    ],
    operator: [
        "viewStacks",
        "viewLogs",
        "startStack",
        "stopStack",
        "restartStack",
        "editStack",
        "createStack",
        "deleteStack",
        "updateImages",
        "useTerminal",
    ],
    admin: [
        "viewStacks",
        "viewLogs",
        "startStack",
        "stopStack",
        "restartStack",
        "editStack",
        "createStack",
        "deleteStack",
        "updateImages",
        "useTerminal",
        "manageUsers",
        "manageAgents",
        "changeSettings",
    ],
};

export function can(role: UserRole, permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
