import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("scheduled_task", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        table.string("action", 32).notNullable();
        table.string("cron", 64).notNullable();
        table.boolean("enabled").notNullable().defaultTo(true);
        table.timestamp("last_run").nullable();
        table.timestamp("next_run").nullable();
        table.index(["stack_name"]); table.index(["enabled"]);
    });
}
export async function down(knex: Knex): Promise<void> { return knex.schema.dropTable("scheduled_task"); }
