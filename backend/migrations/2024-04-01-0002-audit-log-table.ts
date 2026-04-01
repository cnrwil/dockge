import { Knex } from "knex";

/**
 * Migration: create audit_log table
 *
 * Records every significant user action so admins can review
 * who did what and when.
 */
export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("audit_log", (table) => {
        table.increments("id");
        // Who performed the action (null = system)
        table.integer("user_id").nullable().references("id").inTable("user").onDelete("SET NULL");
        table.string("username", 255).notNullable().defaultTo("system");
        // What they did
        table.string("action", 64).notNullable();      // e.g. 'stack.start'
        table.string("target", 255).nullable();        // e.g. stack name or user name
        table.text("detail").nullable();               // optional JSON payload
        // Context
        table.string("ip", 64).nullable();
        table.timestamp("created_at").notNullable().defaultTo(knex.fn.now());

        table.index(["user_id"]);
        table.index(["action"]);
        table.index(["created_at"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable("audit_log");
}
