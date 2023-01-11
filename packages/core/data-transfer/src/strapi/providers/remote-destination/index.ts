import { WebSocket } from 'ws';
import { v4 } from 'uuid';
import { Writable } from 'stream';

import { createDispatcher } from './utils';

import type {
  IDestinationProvider,
  IEntity,
  ILink,
  IMetadata,
  ProviderType,
  IConfiguration,
  IAsset,
} from '../../../../types';
import type { client, server } from '../../../../types/remote/protocol';
import type { ILocalStrapiDestinationProviderOptions } from '../local-destination';
import { TRANSFER_PATH } from '../../remote/constants';

interface ITokenAuth {
  type: 'token';
  token: string;
}

interface ICredentialsAuth {
  type: 'credentials';
  email: string;
  password: string;
}

export interface IRemoteStrapiDestinationProviderOptions
  extends Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'> {
  url: URL;
  auth?: ITokenAuth | ICredentialsAuth;
}

class RemoteStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::remote-strapi';

  type: ProviderType = 'destination';

  options: IRemoteStrapiDestinationProviderOptions;

  ws: WebSocket | null;

  dispatcher: ReturnType<typeof createDispatcher> | null;

  constructor(options: IRemoteStrapiDestinationProviderOptions) {
    this.options = options;
    this.ws = null;
    this.dispatcher = null;
  }

  async initTransfer(): Promise<string> {
    const { strategy, restore } = this.options;

    // Wait for the connection to be made to the server, then init the transfer
    return new Promise<string>((resolve, reject) => {
      this.ws
        ?.once('open', async () => {
          const query = this.dispatcher?.dispatchCommand({
            command: 'init',
            params: { options: { strategy, restore }, transfer: 'push' },
          });

          const res = (await query) as server.Payload<server.InitMessage>;

          if (!res?.transferID) {
            return reject(new Error('Init failed, invalid response from the server'));
          }

          resolve(res.transferID);
        })
        .once('error', reject);
    });
  }

  async #streamStep<T extends client.TransferPushStep>(
    step: T,
    data: client.GetTransferPushStreamData<T>
  ) {
    try {
      await this.dispatcher?.dispatchTransferStep({ action: 'stream', step, data });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      if (typeof e === 'string') {
        return new Error(e);
      }

      return new Error('Unexpected error');
    }

    return null;
  }

  async bootstrap(): Promise<void> {
    const { url, auth } = this.options;

    let ws: WebSocket;

    if (!['https:', 'http:'].includes(url.protocol)) {
      throw new Error(`Invalid protocol "${url.protocol}"`);
    }

    const wsUrl = `${url.protocol === 'https:' ? 'wss:' : 'ws:'}//${url.host}${
      url.pathname
    }${TRANSFER_PATH}`;

    // No auth defined, trying public access for transfer
    if (!auth) {
      ws = new WebSocket(wsUrl);
    }

    // Common token auth, this should be the main auth method
    else if (auth.type === 'token') {
      const headers = { Authorization: `Bearer ${auth.token}` };
      ws = new WebSocket(wsUrl, { headers });
    }

    // Invalid auth method provided
    else {
      throw new Error('Auth method not implemented');
    }

    this.ws = ws;
    this.dispatcher = createDispatcher(this.ws);

    const transferID = await this.initTransfer();

    this.dispatcher.setTransferProperties({ id: transferID, kind: 'push' });

    await this.dispatcher.dispatchTransferAction('bootstrap');
  }

  async close() {
    await this.dispatcher?.dispatchTransferAction('close');

    await new Promise<void>((resolve) => {
      const { ws } = this;

      if (!ws || ws.CLOSED) {
        resolve();
        return;
      }

      ws.on('close', () => resolve()).close();
    });
  }

  getMetadata() {
    return this.dispatcher?.dispatchTransferAction<IMetadata>('getMetadata') ?? null;
  }

  async beforeTransfer() {
    await this.dispatcher?.dispatchTransferAction('beforeTransfer');
  }

  getSchemas(): Promise<Strapi.Schemas | null> {
    if (!this.dispatcher) {
      return Promise.resolve(null);
    }

    return this.dispatcher.dispatchTransferAction<Strapi.Schemas>('getSchemas');
  }

  createEntitiesWriteStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (entity: IEntity, _encoding, callback) => {
        const e = await this.#streamStep('entities', entity);

        callback(e);
      },
    });
  }

  createLinksWriteStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (link: ILink, _encoding, callback) => {
        const e = await this.#streamStep('links', link);

        callback(e);
      },
    });
  }

  createConfigurationWriteStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (configuration: IConfiguration, _encoding, callback) => {
        const e = await this.#streamStep('configuration', configuration);

        callback(e);
      },
    });
  }

  createAssetsWriteStream(): Writable | Promise<Writable> {
    return new Writable({
      objectMode: true,
      final: async (callback) => {
        // TODO: replace this stream call by an end call
        const e = await this.#streamStep('assets', null);

        callback(e);
      },
      write: async (asset: IAsset, _encoding, callback) => {
        const { filename, filepath, stats, stream } = asset;
        const assetID = v4();

        await this.#streamStep('assets', {
          action: 'start',
          assetID,
          data: { filename, filepath, stats },
        });

        for await (const chunk of stream) {
          await this.#streamStep('assets', {
            action: 'stream',
            assetID,
            data: chunk,
          });
        }

        await this.#streamStep('assets', {
          action: 'end',
          assetID,
        });

        callback();
      },
    });
  }
}

export const createRemoteStrapiDestinationProvider = (
  options: IRemoteStrapiDestinationProviderOptions
) => {
  return new RemoteStrapiDestinationProvider(options);
};
