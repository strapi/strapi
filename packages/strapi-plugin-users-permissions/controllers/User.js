'use strict';

/**
 * User.js controller
 *
 * @description: A set of functions called "actions" for managing `User`.
 */

const _ = require('lodash');

module.exports = {

  /**
   * Retrieve user records.
   *
   * @return {Object|Array}
   */

  find: async (ctx) => {
    let data = await strapi.plugins['users-permissions'].services.user.fetchAll(ctx.query);

    if (data) {
      data = _.reduce(data, (acc, user) => {
        acc.push(_.omit(user.toJSON(), ['password', 'resetPasswordToken']));
        return acc;
      }, []);
    }

    // Send 200 `ok`
    ctx.send(data);
  },

  /**
}
   * Retrieve a user record.
   *
   * @return {Object}
   */

  findOne: async (ctx) => {
    let data = await strapi.plugins['users-permissions'].services.user.fetch(ctx.params);

    if (data) {
      data = _.omit(data.toJSON(), ['password', 'resetPasswordToken']);
    }

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
    const user = await strapi.plugins['users-permissions'].services.user.fetch(ctx.params);

    if (_.get(ctx.request, 'body.password') === user.password) {
      delete ctx.request.body.password;
    }

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
