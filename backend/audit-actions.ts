export const AuditAction = {
    AUTH_LOGIN:           "auth.login",
    AUTH_LOGIN_FAILED:    "auth.login_failed",
    AUTH_LOGOUT:          "auth.logout",
    AUTH_TOKEN_LOGIN:     "auth.token_login",
    STACK_CREATE:         "stack.create",
    STACK_EDIT:           "stack.edit",
    STACK_DELETE:         "stack.delete",
    STACK_START:          "stack.start",
    STACK_STOP:           "stack.stop",
    STACK_RESTART:        "stack.restart",
    STACK_UPDATE_IMAGES:  "stack.update_images",
    USER_CREATE:          "user.create",
    USER_UPDATE:          "user.update",
    USER_DELETE:          "user.delete",
    USER_RESET_PASSWORD:  "user.reset_password",
    USER_CHANGE_PASSWORD: "user.change_password",
    SETTINGS_CHANGE:      "settings.change",
    AGENT_ADD:            "agent.add",
    AGENT_REMOVE:         "agent.remove",
} as const;

export type AuditActionType = typeof AuditAction[keyof typeof AuditAction];
