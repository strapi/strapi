'use strict';

module.exports = {
  getReservedNames() {
    return strapi.db.getReservedNames();
  },
};
