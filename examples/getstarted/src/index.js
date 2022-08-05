'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    const payload = { type: 'custom', permissions: ['read', 'delete'], name: 'My custom token v2' };

    const token = await strapi.admin.services['api-token'].create(payload);

    console.log(JSON.stringify(token, null, 2));

    const updatedToken = await strapi.admin.services['api-token'].update(token.id, {
      description: 'foobar',
      permissions: ['read', 'update'],
    });

    console.log(JSON.stringify(updatedToken, null, 2));
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
