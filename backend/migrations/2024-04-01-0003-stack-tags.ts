import { Knex } from "knex";

/**
 * Migration: stack_tag table
 * Tags are free-form labels associated with a stack name.
 * A stack can have multiple tags; a tag can apply to multiple stacks.
 */
export async function up(knex: Knex): Promise<void> {
    await knex.schema.createTable("stack_tag", (table) => {
        table.increments("id");
        table.string("stack_name", 255).notNullable();
        table.string("tag", 64).notNullable();
        table.string("color", 16).notNullable().defaultTo("#6c757d");
        table.unique(["stack_name", "tag"]);
        table.index(["stack_name"]);
        table.index(["tag"]);
    });
}

export async function down(knex: Knex): Promise<void> {
    await knex.schema.dropTable("stack_tag");
}
