'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

module.exports = {

  /**
   * Retrieve user records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    const data = await strapi.plugins['users-permissions'].services.user.fetchAll(ctx.query);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Retrieve a user record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    const data = await strapi.plugins['users-permissions'].services.user.fetch(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Create a/an user record.
   *
   * @return {Object}
   */

  create: async (ctx) => {
    const data = await strapi.plugins['users-permissions'].services.user.add(ctx.request.body);

    // Send 201 `created`
    ctx.created(data);
  },

  /**
   * Update a/an user record.
   *
   * @return {Object}
   */

  update: async (ctx, next) => {
    const data = await strapi.plugins['users-permissions'].services.user.edit(ctx.params, ctx.request.body) ;

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
   * Destroy a/an user record.
   *
   * @return {Object}
   */

  destroy: async (ctx, next) => {
    const data = await strapi.plugins['users-permissions'].services.user.remove(ctx.params);

    // Send 200 `ok`
    ctx.send(data);
  }
};
