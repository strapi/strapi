'use strict';

module.exports = () => ({
  getReservedNames() {
    return {
      models: ['boolean', 'date', 'date-time', 'time', 'upload'],
      attributes: ['id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'published_at'],
    };
    // strapi.db.getReservedNames();
  },
});
