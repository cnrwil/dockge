import { Knex } from "knex";
export async function up(knex: Knex): Promise<void> {
    return knex.schema.createTable("stack_dependency", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        table.string("depends_on", 255).notNullable();
        table.unique(["stack_name", "depends_on"]);
        table.index(["stack_name"]);
    });
}
export async function down(knex: Knex): Promise<void> { return knex.schema.dropTable("stack_dependency"); }
