'use strict';

const { isKnexQuery } = require('@strapi/database');

module.exports = {
  actions: {
    isKnexQuery({ strapi }, { kind, value, isDate }) {
      switch (kind) {
        case 'query':
          return isKnexQuery(strapi.db.connection('strapi_core_store_settings'));
        case 'raw':
          return isKnexQuery(strapi.db.connection.raw('SELECT * FROM strapi_core_store_settings'));
        default:
          // JSON turns a Date into a string: build it again here
          return isKnexQuery(isDate ? new Date(value) : value);
      }
    },
  },
};
