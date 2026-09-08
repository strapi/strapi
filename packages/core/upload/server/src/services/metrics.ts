import type { Core } from '@strapi/types';
import { getService } from '../utils';

const getProviderName = () => strapi.config.get('plugin::upload.provider', 'local');
const isProviderPrivate = async () => strapi.plugin('upload').provider.isPrivate();

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async trackUsage(event: string, properties?: Record<string, any>) {
    const isAiAvailable = strapi.ai.admin.isStrapiManagedAiEnabled();

    return strapi.telemetry.send(event, {
      ...properties,
      eventProperties: {
        ...properties?.eventProperties,
        ...(isAiAvailable === true
          ? { isAiMediaLibraryConfigured: await getService('aiMetadata').isEnabled() }
          : {}),
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
