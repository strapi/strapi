'use strict';

const getProviderName = () => strapi.config.get('plugin.upload.provider', 'local');
const isProviderPrivate = () => strapi.plugin('upload').provider.isPrivate();

module.exports = ({ strapi }) => ({
  async sendUploadPluginMetrics() {
    const uploadProvider = getProviderName();
    const privateProvider = await isProviderPrivate();

    strapi.telemetry.send('didInitializePluginUpload', {
      groupProperties: {
        uploadProvider,
        privateProvider,
      },
    });
  },
});
