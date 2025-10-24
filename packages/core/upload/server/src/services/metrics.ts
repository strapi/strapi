import type { Core } from '@strapi/types';
import { Settings } from '../controllers/validation/admin/settings';

const getProviderName = () => strapi.config.get('plugin::upload.provider', 'local');
const isProviderPrivate = async () => strapi.plugin('upload').provider.isPrivate();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trackUsage(event: string, properties?: Record<string, any>) {
    const settings: Settings = await strapi.plugin('upload').service('upload').getSettings();
    console.log('did do something I want', settings.aiMetadata);
    return strapi.telemetry.send(event, {
      ...properties,
      eventProperties: {
        ...properties?.eventProperties,
        isAIMediaLibraryConfigured: settings.aiMetadata,
      },
    });
  },
  async sendUploadPluginMetrics() {
    const uploadProvider = getProviderName();
    const privateProvider = await isProviderPrivate();

    await this.trackUsage('didInitializePluginUpload', {
      groupProperties: {
        uploadProvider,
        privateProvider,
      },
    });
  },
});
