import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
    await knex.schema.alterTable("user", (table) => { table.string("role", 32).notNullable().defaultTo("operator"); });
    await knex("user").update({ role: "admin" });
}
export async function down(knex: Knex): Promise<void> {
    await knex.schema.alterTable("user", (table) => { table.dropColumn("role"); });
}
