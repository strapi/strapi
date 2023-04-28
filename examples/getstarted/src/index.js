'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  async register({ strapi }) {
    await strapi.admin.services.permission.conditionProvider.register({
      displayName: 'Something',
      name: 'is-something',
      plugin: 'foo',
      handler: (user) => ({
        // name: { $ne: 'MARC' },
        // addresses: { notrepeat_req: { name: 'toto' } },
        'addresses.repeat_req': { $elemMatch: { name: 'toto' } },
        addresses: { $elemMatch: { postal_code: { $eq: '58' } } },
      }),
    });
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  bootstrap({ strapi }) {},

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
