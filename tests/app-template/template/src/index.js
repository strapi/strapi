const { CUSTOM_TRANSFER_TOKEN_ACCESS_KEY } = require('./constants');

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

/**
 * Make sure the test transfer token exists in the database
 * @param {Strapi.Strapi} strapi
 * @returns {Promise<void>}
 */
const createTestTransferToken = async (strapi) => {
  const { token: transferTokenService } = strapi.service('admin::transfer');

  const accessKeyHash = transferTokenService.hash(CUSTOM_TRANSFER_TOKEN_ACCESS_KEY);
  const exists = await transferTokenService.exists({ accessKey: accessKeyHash });

  if (!exists) {
    await transferTokenService.create({
      name: 'TestToken',
      description: 'Transfer token used to seed the e2e database',
      lifespan: null,
      permissions: ['push'],
      accessKey: CUSTOM_TRANSFER_TOKEN_ACCESS_KEY,
    });
  }
};
