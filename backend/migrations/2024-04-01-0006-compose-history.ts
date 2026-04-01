import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("compose_history", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        table.text("compose_yaml").notNullable();
        table.integer("saved_by").nullable().references("id").inTable("user").onDelete("SET NULL");
        table.string("saved_by_username", 255).nullable();
        table.timestamp("saved_at").notNullable().defaultTo(knex.fn.now());
        table.index(["stack_name"]); table.index(["saved_at"]);
    });
}
export async function down(knex: Knex): Promise<void> { return knex.schema.dropTable("compose_history"); }
