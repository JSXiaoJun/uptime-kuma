/**
 * Group icon key for monitor groups.
 *
 * The value is a stable icon key (for example "openai"), not a URL. The
 * frontend maps it to a bundled SVG so no remote asset can be injected into
 * the dashboard.
 */

exports.up = function (knex) {
    return knex.schema.alterTable("monitor", function (table) {
        table.string("icon", 64).defaultTo(null);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("monitor", function (table) {
        table.dropColumn("icon");
    });
};
