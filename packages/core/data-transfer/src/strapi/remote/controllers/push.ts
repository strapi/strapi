import { PassThrough, Writable } from 'stream-chain';

import { IAsset, IMetadata, PushTransferMessage, PushTransferStage } from '../../../../types';
import {
  createLocalStrapiDestinationProvider,
  ILocalStrapiDestinationProviderOptions,
} from '../../providers';

export interface IPushController {
  streams: { [stage in PushTransferStage]?: Writable };
  actions: {
    getMetadata(): Promise<IMetadata>;
    getSchemas(): Strapi.Schemas;
    bootstrap(): Promise<void>;
    close(): Promise<void>;
    beforeTransfer(): Promise<void>;
  };
  transfer: {
    [key in PushTransferStage]: <T extends PushTransferMessage>(
      value: T extends { stage: key; data: infer U } ? U : never
    ) => Promise<void>;
  };
}

const createPushController = (options: ILocalStrapiDestinationProviderOptions): IPushController => {
  const provider = createLocalStrapiDestinationProvider(options);

  const streams: { [stage in PushTransferStage]?: Writable } = {};
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
      async entities(entity) {
        if (!streams.entities) {
          streams.entities = provider.getEntitiesStream();
        }

        await writeAsync(streams.entities, entity);
      },

      async links(link) {
        if (!streams.links) {
          streams.links = await provider.getLinksStream();
        }

        await writeAsync(streams.links, link);
      },

      async configuration(config) {
        if (!streams.configuration) {
          streams.configuration = await provider.getConfigurationStream();
        }

        await writeAsync(streams.configuration, config);
      },

      async assets(payload) {
        if (payload === null) {
          streams.assets?.end();
          return;
        }

        const { step, assetID } = payload;

        if (!streams.assets) {
          streams.assets = await provider.getAssetsStream();
        }

        if (step === 'start') {
          assets[assetID] = { ...payload.data, stream: new PassThrough() };
          writeAsync(streams.assets, assets[assetID]);
        }

        if (step === 'stream') {
          const chunk = Buffer.from(payload.data.chunk.data);

          await writeAsync(assets[assetID].stream, chunk);
        }

        if (step === 'end') {
          await new Promise<void>((resolve, reject) => {
            const { stream } = assets[assetID];

            stream
              .on('close', () => {
                delete assets[assetID];
                resolve();
              })
              .on('error', reject)
              .end();
          });
        }
      },
    },
  };
};

export default createPushController;
