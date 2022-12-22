import type { Context } from 'koa';
import type { ServerOptions } from 'ws';
import { WebSocket } from 'ws';
import { Writable, PassThrough } from 'stream';
import { v4 } from 'uuid';
import {
  IAsset,
  IConfiguration,
  Message,
  ILink,
  IMetadata,
  PushTransferMessage,
  PushEntitiesTransferMessage,
  TransferKind,
  InitMessage,
  PushTransferStage,
} from '../types';
import {
  ILocalStrapiDestinationProviderOptions,
  createLocalStrapiDestinationProvider,
} from './providers';

interface ITransferState {
  kind?: TransferKind;
  transferID?: string;
  controller?: IPushController;
}

// Controllers

interface IPushController {
  streams: { [stage in PushTransferStage]?: Writable };
  actions: {
    getMetadata(): Promise<IMetadata>;
    getSchemas(): Strapi.Schemas;
    bootstrap(): Promise<void>;
    close(): Promise<void>;
    beforeTransfer(): Promise<void>;
  };
  transfer: {
    [key in PushTransferStage]: <T extends PushTransferMessage, P extends PushTransferStage = key>(
      value: T extends { stage: P; data: infer U } ? U : never
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
      async getSchemas() {
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

        await writeAsync(streams.entities!, entity);
      },

      async links(link) {
        if (!streams.links) {
          streams.links = await provider.getLinksStream();
        }

        await writeAsync(streams.links!, link);
      },

      async configuration(config) {
        if (!streams.configuration) {
          streams.configuration = await provider.getConfigurationStream();
        }

        await writeAsync(streams.configuration!, config);
      },

      async assets(asset: any) {
        if (asset === null) {
          streams.assets?.end();
          return;
        }

        const { step, assetID } = asset;

        if (!streams.assets) {
          streams.assets = await provider.getAssetsStream();
        }

        // on init, we create a passthrough stream for the asset chunks
        // send to the assets destination stream the metadata for the current asset
        // + the stream that we just created for the asset
        if (step === 'start') {
          assets[assetID] = { ...asset.data, stream: new PassThrough() };
          writeAsync(streams.assets!, assets[assetID]);
        }

        // propagate the chunk
        if (step === 'stream') {
          await writeAsync(assets[assetID].stream, Buffer.from(asset.data.chunk));
        }

        // on end, we indicate that all the chunks have been sent
        if (step === 'end') {
          await new Promise<void>((resolve, reject) => {
            assets[assetID].stream
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

const createTransferController =
  (options: ServerOptions = {}) =>
  async (ctx: Context) => {
    const upgradeHeader = (ctx.request.headers.upgrade || '')
      .split(',')
      .map((s) => s.trim().toLowerCase());

    // Create the websocket server
    const wss = new WebSocket.Server({ ...options, noServer: true });

    if (upgradeHeader.includes('websocket')) {
      wss.handleUpgrade(ctx.req, ctx.request.socket, Buffer.alloc(0), (ws) => {
        // Create a connection between the client & the server
        wss.emit('connection', ws, ctx.req);

        const state: ITransferState = {};
        let uuid: string | undefined;

        const callback = <T = unknown>(e: Error | null = null, data?: T) => {
          return new Promise<void>((resolve, reject) => {
            if (!uuid) {
              reject(new Error('Missing uuid for this message'));
              return;
            }

            const payload = JSON.stringify({
              uuid,
              data: data ?? {},
              error: e,
            });

            ws.send(payload, (error) => (error ? reject(error) : resolve()));
          });
        };

        const answer = async <T = unknown>(fn: () => T) => {
          try {
            const response = await fn();
            callback(null, response);
          } catch (e) {
            if (e instanceof Error) {
              callback(e);
            } else if (typeof e === 'string') {
              callback(new Error(e));
            } else {
              callback(new Error('Unexpected error'));
            }
          }
        };

        const teardown = () => {
          delete state.kind;
          delete state.controller;
          delete state.transferID;

          return { ok: true };
        };

        const init = (msg: InitMessage) => {
          const { kind, options: controllerOptions } = msg;

          if (state.controller) {
            throw new Error('Transfer already in progres');
          }

          if (kind === 'push') {
            state.controller = createPushController({
              ...controllerOptions,
              autoDestroy: false,
              getStrapi() {
                return strapi;
              },
            });
          }

          // Pull or others
          else {
            throw new Error(`${kind} transfer not implemented`);
          }

          state.transferID = v4();

          return { transferID: state.transferID };
        };

        ws.on('close', () => {
          teardown();
        });

        ws.on('error', (e) => {
          teardown();
          console.error(e);
        });

        ws.on('message', async (raw) => {
          const msg: Message = JSON.parse(raw.toString());

          if (!msg.uuid) {
            throw new Error('Missing uuid in message');
          }

          uuid = msg.uuid;

          if (msg.type === 'init') {
            await answer(() => init(msg));
          }

          if (msg.type === 'teardown') {
            await answer(teardown);
          }

          if (msg.type === 'action') {
            await answer(() => state.controller?.actions[msg.action]?.());
          }

          if (msg.type === 'transfer') {
            await answer(() => {
              const fn = state.controller?.transfer[msg.stage];

              type Msg = typeof msg;

              fn?.<Msg, Msg['stage']>(msg.data);
            });
          }
        });
      });

      ctx.respond = false;
    }
  };

const registerTransferRoute = (strapi: any) => {
  strapi.admin.routes.push({
    method: 'GET',
    path: '/transfer',
    handler: createTransferController(),
    config: { auth: false },
  });
};

const register = (strapi: any) => {
  registerTransferRoute(strapi);
};

export default register;

/**
 * entities:start
 * entities:transfer
 * entities:end
 *
 *
 * assets:start
 *
 * assets:transfer:start
 * assets:transfer:stream
 * assets:transfer:end
 *
 * assets:end
 */
