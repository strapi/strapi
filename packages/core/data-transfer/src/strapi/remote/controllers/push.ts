import { PassThrough, Writable } from 'stream-chain';

import type { IAsset, IMetadata } from '../../../../types';
import type {
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
    },

    transfer: {
      async entities(entities) {
        if (!streams.entities) {
          streams.entities = provider.createEntitiesWriteStream();
        }
        entities.map(async (entity) => {
          if (streams.entities) {
            await writeAsync(streams.entities, entity);
          }
        });
      },

      async links(links) {
        if (!streams.links) {
          streams.links = await provider.createLinksWriteStream();
        }
        links.map(async (link) => {
          if (streams.links) {
            await writeAsync(streams.links, link);
          }
        });
      },

      async configuration(configs) {
        if (!streams.configuration) {
          streams.configuration = await provider.createConfigurationWriteStream();
        }
        configs.map(async (config) => {
          if (streams.configuration) {
            await writeAsync(streams.configuration, config);
          }
        });
      },

      async assets(payload) {
        // TODO: close the stream upong receiving an 'end' event instead
        if (payload === null) {
          const assetsKeys = Object.keys(assets);
          const previousAssetId = assetsKeys[assetsKeys.length - 1];
          const { stream } = assets[previousAssetId];
          stream
            .on('close', () => {
              delete assets[previousAssetId];
            })
            .on('error', (error) => {
              throw new Error(`error while closing stream ${error}`);
            })
            .end();
          streams.assets?.end();
          return;
        }

        if (!streams.assets) {
          streams.assets = await provider.createAssetsWriteStream();
        }

        payload.map(async (asset) => {
          const { action, assetID, data, chunk } = asset;
          const assetsKeys = Object.keys(assets);
          if (action === 'stream') {
            if (!assets[assetID] && assetsKeys.length !== 0) {
              const previousAssetId = assetsKeys[assetsKeys.length - 1];
              const { stream } = assets[previousAssetId];
              stream
                .on('close', () => {
                  delete assets[previousAssetId];
                })
                .on('error', (error) => {
                  throw new Error(`error while closing stream ${error}`);
                })
                .end();
            }

            if (!assets[assetID] && streams.assets) {
              assets[assetID] = { ...data, stream: new PassThrough() };
              writeAsync(streams.assets, assets[assetID]);
            }
            // The buffer has gone through JSON operations and is now of shape { type: "Buffer"; data: UInt8Array }
            // We need to transform it back into a Buffer instance
            const rawBuffer = chunk as unknown as { type: 'Buffer'; data: Uint8Array };
            const buffer = Buffer.from(rawBuffer.data);
            await writeAsync(assets[assetID].stream, buffer);
          }
        });
      },
    },
  };
};

export default createPushController;
