/**
 * Icon key for public status-page groups.
 *
 * The value is a bundled icon key (for example "openai"), not a URL.
 */

exports.up = function (knex) {
    return knex.schema.alterTable("group", function (table) {
        table.string("icon", 64).defaultTo(null);
    });
};

exports.down = function (knex) {
    return knex.schema.alterTable("group", function (table) {
        table.dropColumn("icon");
    });
};
