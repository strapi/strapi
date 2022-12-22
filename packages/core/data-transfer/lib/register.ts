import type { Context } from 'koa';
import type { ServerOptions } from 'ws';
import { WebSocket } from 'ws';
import { Writable } from 'stream';
import { IAsset, IConfiguration, IEntity, ILink, IMetadata, TransferStage } from '../types';
import {
  createLocalStrapiDestinationProvider,
  ILocalStrapiDestinationProviderOptions,
} from './providers';

type PushTransferStage = Exclude<TransferStage, 'schemas'>;
type MessageKind = 'push' | 'pull';

type Message = { uuid: string } & (InitMessage | TransferMessage | ActionMessage | TeardownMessage);

// init

type InitMessage = { type: 'init' } & (IPushInitMessage | IPullInitMessage);

interface IPushInitMessage {
  type: 'init';
  kind: 'push';
  data: Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'>;
}

interface IPullInitMessage {
  type: 'init';
  kind: 'pull';
}

// teardown

type TeardownMessage = { type: 'teardown' };

// action

type ActionMessage = {
  type: 'action';
  action: 'bootstrap' | 'close' | 'beforeTransfer' | 'getMetadata' | 'getSchemas';
};

// transfer

type TransferMessage = PushTransferMessage;

type PushTransferMessage = { type: 'transfer' } & (
  | PushEntityMessage
  | PushLinkMessage
  | PushAssetMessage
  | PushConfigurationMessage
);

type PushEntityMessage = { stage: 'entities'; data: IEntity };
type PushLinkMessage = { stage: 'links'; data: ILink };
type PushAssetMessage = { stage: 'assets'; data: IAsset };
type PushConfigurationMessage = { stage: 'configuration'; data: IConfiguration };

// Internal state

interface ITransferState {
  kind?: MessageKind;
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
    entities(entity: IEntity): Promise<void> | void;
    links(link: ILink): Promise<void> | void;
    configuration(configuration: IConfiguration): Promise<void> | void;
    assets(asset: IAsset): Promise<void> | void;
  };
}

const createPushController = (
  ws: WebSocket,
  options: ILocalStrapiDestinationProviderOptions
): IPushController => {
  const provider = createLocalStrapiDestinationProvider(options);

  const streams: { [stage in PushTransferStage]?: Writable } = {};

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

      async assets(asset) {
        if (!streams.assets) {
          streams.assets = await provider.getAssetsStream();
        }
        await writeAsync(streams.assets, asset);
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

          return { ok: true };
        };

        const init = (kind: MessageKind, data: unknown = {}) => {
          if (state.controller) {
            throw new Error('Transfer already in progres');
          }

          if (kind === 'push') {
            state.controller = createPushController(ws, {
              ...(data as IPushInitMessage['data']),
              autoDestroy: false,
              getStrapi() {
                return strapi;
              },
            });
          }

          return { ok: true };
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
            await answer(() => init(msg.kind, (msg as any)?.data));
          }

          if (msg.type === 'teardown') {
            await answer(teardown);
          }

          if (msg.type === 'action') {
            await answer(() => state.controller?.actions[msg.action]?.());
          }

          if (msg.type === 'transfer') {
            await answer(() => state.controller?.transfer[msg.stage]?.(msg.data as any));
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
