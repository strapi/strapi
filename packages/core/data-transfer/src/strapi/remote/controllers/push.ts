import { PassThrough, Writable } from 'stream-chain';

import type { IAsset, IMetadata } from '../../../../types';
import type {
  TransferAssetFlow,
  TransferPushMessage,
  TransferPushStep,
} from '../../../../types/remote/protocol/client';
import {
  createLocalStrapiDestinationProvider,
  ILocalStrapiDestinationProviderOptions,
} from '../../providers';

export interface IPushController {
  streams: { [stage in TransferPushStep]?: Writable };
  actions: {
    getMetadata(): Promise<IMetadata>;
    getSchemas(): Strapi.Schemas;
    bootstrap(): Promise<void>;
    close(): Promise<void>;
    beforeTransfer(): Promise<void>;
    rollback(): Promise<void>;
  };
  transfer: {
    [key in TransferPushStep]: <T extends TransferPushMessage>(
      value: T extends { step: key; data: infer U } ? U : never
    ) => Promise<void>;
  };
}

const createPushController = (options: ILocalStrapiDestinationProviderOptions): IPushController => {
  const provider = createLocalStrapiDestinationProvider(options);

  const streams: { [stage in TransferPushStep]?: Writable } = {};
  const assets: { [filepath: string]: IAsset & { stream: PassThrough } } = {};

  const writeAsync = <T>(stream: Writable, data: T) => {
    return new Promise<void>((resolve, reject) => {
      stream.write(data, (error) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  };

  return {
    streams,

    actions: {
      async getSchemas(): Promise<Strapi.Schemas> {
        return provider.getSchemas();
      },

      async getMetadata() {
        return provider.getMetadata();
      },

      async bootstrap() {
        return provider.bootstrap();
      },

      async close() {
        return provider.close();
      },

      async beforeTransfer() {
        return provider.beforeTransfer();
      },

      async rollback() {
        await provider.rollback();
      },
    },

    transfer: {
      async entities(entities) {
        if (!streams.entities) {
          streams.entities = provider.createEntitiesWriteStream();
        }

        for (const entity of entities) {
          if (streams.entities) {
            await writeAsync(streams.entities, entity);
          }
        }
      },

      async links(links) {
        if (!streams.links) {
          streams.links = await provider.createLinksWriteStream();
        }

        for (const link of links) {
          if (streams.links) {
            await writeAsync(streams.links, link);
          }
        }
      },

      async configuration(configs) {
        if (!streams.configuration) {
          streams.configuration = await provider.createConfigurationWriteStream();
        }

        for (const config of configs) {
          if (streams.configuration) {
            await writeAsync(streams.configuration, config);
          }
        }
      },

      async assets(payloads) {
        if (payloads === null) {
          streams.assets?.end();
          return;
        }

        if (!streams.assets) {
          streams.assets = await provider.createAssetsWriteStream();
        }

        for (const payload of payloads as Array<TransferAssetFlow>) {
          if (streams.assets.closed) {
            return;
          }

          const { action, assetID } = payload;

          if (action === 'start' && streams.assets) {
            assets[assetID] = { ...payload.data, stream: new PassThrough() };
            writeAsync(streams.assets, assets[assetID]);
          }

          if (action === 'stream') {
            // The buffer has gone through JSON operations and is now of shape { type: "Buffer"; data: UInt8Array }
            // We need to transform it back into a Buffer instance
            const rawBuffer = payload.data as unknown as { type: 'Buffer'; data: Uint8Array };
            const chunk = Buffer.from(rawBuffer.data);

            await writeAsync(assets[assetID].stream, chunk);
          }

          if (action === 'end') {
            await new Promise<void>((resolve, reject) => {
              const { stream } = assets[assetID];

              stream
                .on('close', () => {
                  delete assets[assetID];
                  resolve();
                })
                .on('error', (e) => {
                  reject(e);
                })
                .end();
            });
          }
        }
      },
    },
  };
};

export default createPushController;
