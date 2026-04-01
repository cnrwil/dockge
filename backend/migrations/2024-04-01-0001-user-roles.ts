import { Knex } from "knex";

/**
 * Migration: add role column to user table
 * Roles: admin | operator | viewer
 *   admin    - full access, can manage users
 *   operator - can start/stop/edit stacks, cannot manage users
 *   viewer   - read-only access
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("user", (table) => {
        table.string("role", 32).notNullable().defaultTo("operator");
    });
    // Ensure the first/existing user is always an admin
    await knex("user").update({ role: "admin" });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("user", (table) => {
        table.dropColumn("role");
    });
}
