const { createTestTransferToken } = require('./create-transfer-token');

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }) {
    strapi.service('api::config.config').rateLimitEnable(false);
    strapi.service('api::config.config').adminAutoOpenEnable(false);

    await createTestTransferToken(strapi);
  },
};
