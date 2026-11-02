import { Readable } from 'stream';
import { chain } from 'stream-chain';
import type { Core } from '@strapi/types';

import type { IConfiguration } from '../../../types';
import { enrichProjectSettingsForExport } from '../../utils/project-settings-logos';

/**
 * Create a readable stream that export the Strapi app configuration
 */
export const createConfigurationStream = (strapi: Core.Strapi): Readable => {
  return Readable.from(
    (async function* configurationGenerator(): AsyncGenerator<IConfiguration> {
      // Core Store
      const coreStoreStream = chain([
        strapi.db.queryBuilder('strapi::core-store').stream(),
        (data) => ({ ...data, value: JSON.parse(data.value) }),
        wrapConfigurationItem('core-store'),
      ]);

      // Webhook
      const webhooksStream = chain([
        strapi.db.queryBuilder('strapi::webhook').stream(),
        wrapConfigurationItem('webhook'),
      ]);

      const streams = [coreStoreStream, webhooksStream];

      for (const stream of streams) {
        for await (const item of stream) {
          if (item.type === 'core-store') {
            yield {
              ...item,
              value: await enrichProjectSettingsForExport(
                strapi,
                item.value as { key: string; value: unknown }
              ),
            };
            continue;
          }

          yield item;
        }
      }
    })()
  );
};

const wrapConfigurationItem = (type: 'core-store' | 'webhook') => (value: unknown) => ({
  type,
  value,
});
