import { Knex } from "knex";

/**
 * Migration: stack_dependency table
 * Records that `stack_name` depends on `depends_on` being healthy before it starts.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("stack_dependency", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        table.string("depends_on", 255).notNullable();
        table.unique(["stack_name", "depends_on"]);
        table.index(["stack_name"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("stack_dependency");
}
