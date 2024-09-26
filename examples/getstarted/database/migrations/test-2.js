'use strict';

module.exports = {
  async up(knex) {
    await knex.schema.alterTable('countries', (table) => {
      table.unique('name');
    });
  },

  async down(knex) {
    await knex.schema.alterTable('countries', (table) => {
      table.dropUnique('name');
    });
  },
};
