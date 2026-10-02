import type { Plugin } from '@strapi/types';
import { controllers } from './controllers';
import { services } from './services';
import { routes } from './routes';
import { getService } from './utils';
import { historyVersion } from './models/history-version';
import { DEFAULT_RETENTION_DAYS } from './services/utils';

/**
 * Check once if the feature is enabled before loading it,
 * so that we can assume it is enabled in the other files.
 */
const getFeature = (): Partial<Plugin.LoadedPlugin> => {
  if (strapi.ee.features.isEnabled('cms-content-history')) {
    return {
      register({ strapi }) {
        strapi.get('models').add(historyVersion);
      },
      bootstrap({ strapi }) {
        strapi.ee.entitlements.register({
          feature: 'cms-content-history',
          limits: [
            {
              key: 'retentionDays',
              unit: 'days',
              get() {
                const featureConfig = strapi.ee.features.get('cms-content-history');
                const licenseRetentionDays =
                  typeof featureConfig === 'object' ? featureConfig?.options?.retentionDays : null;
                // Report the license-granted ceiling (99999 for gold => normalized to
                // "Unlimited"). This intentionally differs from the ENFORCED value in
                // getRetentionDays(), which caps UNCONFIGURED retention at DEFAULT_RETENTION_DAYS;
                // a user may raise retention up to this license ceiling via admin.history.retentionDays.
                return licenseRetentionDays ?? DEFAULT_RETENTION_DAYS;
              },
            },
          ],
        });

        // Start recording history and saving history versions
        getService(strapi, 'lifecycles').bootstrap();
      },
      destroy({ strapi }) {
        getService(strapi, 'lifecycles').destroy();
      },
      controllers,
      services,
      routes,
    };
  }

  /**
   * Keep registering the model to avoid losing the data if the feature is disabled,
   * or if the license expires.
   */
  return {
    register({ strapi }) {
      strapi.get('models').add(historyVersion);
    },
  };
};

export default getFeature();
