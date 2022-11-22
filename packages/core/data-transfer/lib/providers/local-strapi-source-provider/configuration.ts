import { chain } from 'stream-chain';
import { Readable } from 'stream';
import { set } from 'lodash/fp';

/**
 * Create a readable stream that export the Strapi app configuration
 */
export const createConfigurationStream = (strapi: Strapi.Strapi): Readable => {
  // Core Store
  const coreStoreStream = chain([
    strapi.db.queryBuilder('strapi::core-store').stream(),
    (data) => set('value', JSON.parse(data.value), data),
    wrapConfigurationItem('core-store'),
  ]);

  // Webhook
  const webhooksStream = chain([
    strapi.db.queryBuilder('webhook').stream(),
    wrapConfigurationItem('webhook'),
  ]);

  const streams = [coreStoreStream, webhooksStream];

  // Readable configuration stream
  return Readable.from(
    (async function* () {
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
