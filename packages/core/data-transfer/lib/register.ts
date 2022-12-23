import type { Context } from 'koa';
import type { ServerOptions } from 'ws';
import { WebSocket } from 'ws';
import { Writable, PassThrough } from 'stream';
import { v4 } from 'uuid';
import {
  IAsset,
  Message,
  IMetadata,
  PushTransferMessage,
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
              const { stage, data } = msg;

              return state.controller?.transfer[stage](data as never);
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
