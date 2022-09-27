'use strict';

module.exports = () => ({
  getReservedNames() {
    return {
      models: ['boolean', 'date', 'date-time', 'dateTime', 'time', 'upload'],
      attributes: [
        'id',
        'created_at',
        'createdAt',
        'updated_at',
        'updatedAt',
        'created_by',
        'createdBy',
        'updated_by',
        'updatedBy',
        'published_at',
        'publishedAt',
      ],
    };
    // strapi.db.getReservedNames();
  },
});
