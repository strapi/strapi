import type { Core } from '@strapi/types';

const getProviderName = () => strapi.config.get('plugin::upload.provider', 'local');
const isProviderPrivate = async () => strapi.plugin('upload').provider.isPrivate();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
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
