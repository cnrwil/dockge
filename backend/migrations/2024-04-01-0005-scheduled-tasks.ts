import { Knex } from "knex";

export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("scheduled_task", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        // 'start' | 'stop' | 'restart' | 'pull'
        table.string("action", 32).notNullable();
        // Standard 5-field cron expression e.g. "0 3 * * *"
        table.string("cron", 64).notNullable();
        table.boolean("enabled").notNullable().defaultTo(true);
        table.timestamp("last_run").nullable();
        table.timestamp("next_run").nullable();
        table.index(["stack_name"]);
        table.index(["enabled"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("scheduled_task");
}
