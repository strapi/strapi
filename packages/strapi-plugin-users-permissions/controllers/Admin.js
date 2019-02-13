'use strict';

/**
 * Admin.js controller
 *
 * @description: A set of functions called "actions" for managing `Admin`.
 */

const _ = require('lodash');

module.exports = {

  /**
   * Create a/an admin record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const values = ctx.request.body;

    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    const data = await strapi.query('admin', 'users-permissions').create(values);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an admin record.
   *
   * @return {Object}
   */

  update: async (ctx) => {
    const values = ctx.request.body;

    if (values.password) {
      values.password = await strapi.plugins['users-permissions'].services.user.hashPassword(values);
    }

    const data = await strapi.query('admin', 'users-permissions').update(_.assign(ctx.params, values));

    // Send 200 `ok`
    ctx.send(data);
  }
};
