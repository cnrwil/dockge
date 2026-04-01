export type UserRole = "admin" | "operator" | "viewer";

const ROLE_HIERARCHY: UserRole[] = ["viewer", "operator", "admin"];

export function hasRole(role: UserRole, required: UserRole): boolean {
    return ROLE_HIERARCHY.indexOf(role) >= ROLE_HIERARCHY.indexOf(required);
}

export const ROLE_LABELS: Record<UserRole, string> = {
    admin: "Admin",
    operator: "Operator",
    viewer: "Viewer",
};

export const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
    viewer: ["viewStacks", "viewLogs"],
    operator: ["viewStacks", "viewLogs", "startStack", "stopStack", "restartStack", "editStack", "createStack", "deleteStack", "updateImages", "useTerminal"],
    admin: ["viewStacks", "viewLogs", "startStack", "stopStack", "restartStack", "editStack", "createStack", "deleteStack", "updateImages", "useTerminal", "manageUsers", "manageAgents", "changeSettings"],
};

export function can(role: UserRole, permission: string): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
