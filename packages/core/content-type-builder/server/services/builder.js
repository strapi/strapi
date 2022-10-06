'use strict';

module.exports = () => ({
  getReservedNames() {
    return {
      models: ['boolean', 'date', 'date-time', 'dateTime', 'time', 'upload'],
      attributes: [
        'id',
        'created_at',
        'createdat',
        'updated_at',
        'updatedAt',
        'created_by',
        'createdby',
        'updated_by',
        'updatedby',
        'published_at',
        'publishedat',
      ],
    };
    // strapi.db.getReservedNames();
  },
});
