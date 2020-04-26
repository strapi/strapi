'use strict';

module.exports = {
  getRestrictedNames(ctx) {
    const defaultConnectionTimestamps = strapi.db.getDefaultConnector().defaultTimestamps || [];

    ctx.body = {
      models: ['admin'], // contentTypes and components
      attributes: [
        '_id',
        'id',
        'length',
        'attributes',
        'relations',
        'changed',
        ...defaultConnectionTimestamps,
      ],
    };
  },
};
