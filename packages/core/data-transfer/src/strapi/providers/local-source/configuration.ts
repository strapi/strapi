import { Readable } from 'stream';
import { chain } from 'stream-chain';
import { set } from 'lodash/fp';
import type { Core } from '@strapi/types';

import type { IConfiguration } from '../../../../types';

/**
 * Create a readable stream that export the Strapi app configuration
 */
export const createConfigurationStream = (strapi: Core.Strapi): Readable => {
  return Readable.from(
    (async function* configurationGenerator(): AsyncGenerator<IConfiguration> {
      // Core Store
      const coreStoreStream = chain([
        strapi.db.queryBuilder('strapi::core-store').stream(),
        (data) => set('value', JSON.parse(data.value), data),
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
