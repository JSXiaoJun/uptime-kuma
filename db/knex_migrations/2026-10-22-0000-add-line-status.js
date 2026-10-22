/**
 * Line Status module
 *
 * Adds tables used by the custom "line load" feature:
 *   - line_status         : one row per monitored relay line (hk1, us1, ...)
 *   - line_status_sample  : periodic samples of the reported load
 *   - group_line          : associates a line with a public status page group
 */

exports.up = async function (knex) {
    const hasLineStatus = await knex.schema.hasTable("line_status");
    if (!hasLineStatus) {
        await knex.schema.createTable("line_status", (table) => {
            table.increments("id");
            table.string("name", 255).notNullable();
            table.string("display_name", 255);
            table.string("endpoint", 1024).notNullable();
            table.integer("capacity_mbps").defaultTo(80);
            table.integer("interval_seconds").defaultTo(300);
            table.integer("enabled").defaultTo(1);
            table.integer("weight").defaultTo(1);
            table.datetime("created_date").defaultTo(knex.fn.now());
            table.datetime("last_checked").nullable();
            table.text("last_error").nullable();
            table.integer("last_usage_percent").nullable();
            table.string("last_load_level", 32).nullable();
            table.string("last_status", 32).nullable();
            table.string("last_text", 255).nullable();
            table.index(["enabled"], "line_status_enabled_index");
        });
    }

    const hasSample = await knex.schema.hasTable("line_status_sample");
    if (!hasSample) {
        await knex.schema.createTable("line_status_sample", (table) => {
            table.increments("id");
            table.integer("line_id").notNullable();
            table.decimal("usage_percent", 6, 2).nullable();
            table.string("load_level", 32).nullable();
            table.string("status", 32).nullable();
            table.string("text", 255).nullable();
            table.datetime("sample_time").defaultTo(knex.fn.now());
            table.index(["line_id", "sample_time"], "line_status_sample_line_time_index");
            table.index(["sample_time"], "line_status_sample_time_index");
        });
    }

    const hasGroupLine = await knex.schema.hasTable("group_line");
    if (!hasGroupLine) {
        await knex.schema.createTable("group_line", (table) => {
            table.increments("id");
            table.integer("group_id").notNullable();
            table.integer("line_id").notNullable();
            table.integer("weight").defaultTo(1);
            table.index(["group_id"], "group_line_group_index");
            table.index(["line_id"], "group_line_line_index");
        });
    }
};

exports.down = async function (knex) {
    await knex.schema.dropTableIfExists("group_line");
    await knex.schema.dropTableIfExists("line_status_sample");
    await knex.schema.dropTableIfExists("line_status");
};
