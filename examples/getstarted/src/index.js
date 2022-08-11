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
    const tokens = await strapi.admin.services['api-token'].list();
    const promises = [];
    tokens.forEach(({ id }) => {
      promises.push(strapi.admin.services['api-token'].revoke(id));
    });
    await Promise.all(promises);
    const tokens2 = await strapi.admin.services['api-token'].list();
    console.log('tokens:', tokens2.length);

    const payload = { type: 'custom', permissions: ['read', 'delete'], name: 'custom token v2' };
    const token = await strapi.admin.services['api-token'].create(payload);
    console.log('custom-before', JSON.stringify(token, null, 2));
    const updatedToken = await strapi.admin.services['api-token'].update(token.id, {
      description: 'foobar',
      permissions: ['admin::thing.read', 'admin::thing.update'],
    });
    console.log('custom-after', JSON.stringify(updatedToken, null, 2));
  },

  /**
   * An asynchronous destroy function that runs before
   * your application gets shut down.
   *
   * This gives you an opportunity to gracefully stop services you run.
   */
  destroy({ strapi }) {},
};
