import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("audit_log", (table) => {
        table.increments("id");
        table.integer("user_id").nullable().references("id").inTable("user").onDelete("SET NULL");
        table.string("username", 255).notNullable().defaultTo("system");
        table.string("action", 64).notNullable();
        table.string("target", 255).nullable();
        table.text("detail").nullable();
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
