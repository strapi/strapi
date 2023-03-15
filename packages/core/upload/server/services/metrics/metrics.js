'use strict';

const getProviderName = () => strapi.config.get('plugin.upload.provider', 'local');
const getProviderIsPrivate = () => strapi.plugin('upload').provider.isPrivate();

module.exports = ({ strapi }) => ({
  async sendUploadPluginMetrics() {
    const provider = await getProviderName();
    const isPrivate = await getProviderIsPrivate();

    await strapi.telemetry.send('didInitializePluginUpload', {
      groupProperties: { provider, isPrivate },
    });
  },
});
