'use strict';

/**
 * default mongoose controller
 *
 */
module.exports = ({ service }) => ({
  /**
   * Retrieve records.
   *
   * @return {Object|Array}
   */

  find: async (ctx, next, { populate } = {}) => {
    if (ctx.query._q) {
      return service.search(ctx.query);
    } else {
      return service.fetchAll(ctx.query, populate);
    }
  },

  /**
   * Retrieve a record.
   *
   * @return {Object}
   */

  findOne: async ctx => {
    if (!ctx.params._id.match(/^[0-9a-fA-F]{24}$/)) {
      return ctx.notFound();
    }

    return service.fetch(ctx.params);
  },

  /**
   * Count records.
   *
   * @return {Number}
   */

  count: async ctx => {
    return service.count(ctx.query);
  },

  /**
   * Create a record.
   *
   * @return {Object}
   */

  create: async ctx => {
    return service.add(ctx.request.body);
  },

  /**
   * Update a record.
   *
   * @return {Object}
   */

  update: async ctx => {
    return service.edit(ctx.params, ctx.request.body);
  },

  /**
   * Destroy a record.
   *
   * @return {Object}
   */

  destroy: async ctx => {
    return service.remove(ctx.params);
  },
});
