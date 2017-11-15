'use strict';

/**
 * UsersPermissions.js controller
 *
 * @description: A set of functions called "actions" of the `users-permissions` plugin.
 */

module.exports = {

  /**
   * Default action.
   *
   * @return {Object}
   */
  getRole: async(ctx) => {
    const { id } = ctx.params;

    ctx.send({ ok: true });
  },

  index: async (ctx) => {
    // Add your own logic here.

    // Send 200 `ok`
    ctx.send({
      message: 'ok'
    });
  },

  init: async (ctx) => {
    // Will be deleted
    ctx.send({ hasAdmin: ctx.params.hasAdmin === 'true' });
  }
};
