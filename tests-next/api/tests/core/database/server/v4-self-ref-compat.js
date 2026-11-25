'use strict';

module.exports = {
  actions: {
    hasTable({ strapi }, { table }) {
      return strapi.db.getSchemaConnection().hasTable(table);
    },
  },
};
