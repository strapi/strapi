'use strict';

module.exports = {
  withDefaults(attributes) {
    return {
      roles: [],
      isActive: false,
      ...attributes,
    };
  },

  async create(attributes) {
    const user = this.withDefaults(attributes);
    return strapi.query('user', 'admin').create(user);
  },

  async exists(attributes) {
    return !!(await strapi.query('user', 'admin').findOne(attributes));
  },
};
