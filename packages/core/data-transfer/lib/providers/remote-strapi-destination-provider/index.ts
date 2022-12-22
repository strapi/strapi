import { WebSocket } from 'ws';
import { v4 } from 'uuid';
import { Writable } from 'stream';

import type {
  IDestinationProvider,
  IEntity,
  ILink,
  IMetadata,
  ProviderType,
  IConfiguration,
  TransferStage,
  IAsset,
} from '../../../types';
import type { ILocalStrapiDestinationProviderOptions } from '../local-strapi-destination-provider';

interface ITokenAuth {
  type: 'token';
  token: string;
}

interface ICredentialsAuth {
  type: 'credentials';
  email: string;
  password: string;
}

interface IRemoteStrapiDestinationProvider
  extends Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'> {
  url: string;
  auth?: ITokenAuth | ICredentialsAuth;
}

type Actions = 'bootstrap' | 'close' | 'beforeTransfer' | 'getMetadata' | 'getSchemas';

export const createRemoteStrapiDestinationProvider = (
  options: IRemoteStrapiDestinationProvider
) => {
  return new RemoteStrapiDestinationProvider(options);
};

class RemoteStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::remote-strapi';

  type: ProviderType = 'destination';

  options: IRemoteStrapiDestinationProvider;

  ws: WebSocket | null;

  constructor(options: IRemoteStrapiDestinationProvider) {
    this.options = options;
    this.ws = null;
  }

  async #dispatch<U = unknown, T extends object = object>(message: T): Promise<U> {
    const { ws } = this;

    if (!ws) {
      throw new Error('No ws connection found');
    }

    return new Promise((resolve, reject) => {
      const uuid = v4();
      const payload = JSON.stringify({ ...message, uuid });

      ws.send(payload, (error) => {
        if (error) {
          reject(error);
        }
      });

      ws.once('message', (raw) => {
        const response: { uuid: string; data: U; error: string | null } = JSON.parse(
          raw.toString()
        );

        if (response.error) {
          return reject(new Error(response.error));
        }

        if (response.uuid === uuid) {
          return resolve(response.data);
        }
      });
    });
  }

  async #dispatchAction<T = unknown>(action: Actions) {
    return this.#dispatch<T>({ type: 'action', action });
  }

  async #dispatchTransfer<T = unknown>(stage: TransferStage, data: T) {
    try {
      await this.#dispatch({ type: 'transfer', stage, data });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      return new Error('Unexected error');
    }

    return null;
  }

  async bootstrap(): Promise<void> {
    const { url, auth, strategy, restore } = this.options;

    let ws: WebSocket;

    // No auth defined, trying public access for transfer
    if (!auth) {
      ws = new WebSocket(url);
    }

    // Common token auth, this should be the main auth method
    else if (auth.type === 'token') {
      const headers = { Authentication: `Bearer ${auth.token}` };

      ws = new WebSocket(this.options.url, { headers });
    }

    // Invalid auth method provided
    else {
      throw new Error('Auth method not implemented');
    }

    this.ws = ws;

    // Wait for the connection to be made to the server, then init the transfer
    await new Promise<void>((resolve, reject) => {
      ws.once('open', async () => {
        await this.#dispatch({ type: 'init', kind: 'push', data: { strategy, restore } });
        resolve();
      }).once('error', reject);
    });

    // Run the bootstrap
    await this.#dispatchAction('bootstrap');
  }

  async close() {
    await this.#dispatchAction('close');

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
    return this.#dispatchAction<IMetadata>('getMetadata');
  }

  async beforeTransfer() {
    await this.#dispatchAction('beforeTransfer');
  }

  getSchemas(): Promise<Strapi.Schemas> {
    return this.#dispatchAction<Strapi.Schemas>('getSchemas');
  }

  getEntitiesStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (entity: IEntity, _encoding, callback) => {
        const e = await this.#dispatchTransfer('entities', entity);

        callback(e);
      },
    });
  }

  getLinksStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (link: ILink, _encoding, callback) => {
        const e = await this.#dispatchTransfer('links', link);

        callback(e);
      },
    });
  }

  getConfigurationStream(): Writable {
    return new Writable({
      objectMode: true,
      write: async (configuration: IConfiguration, _encoding, callback) => {
        const e = await this.#dispatchTransfer('configuration', configuration);

        callback(e);
      },
    });
  }

  getAssetsStream(): Writable | Promise<Writable> {
    return new Writable({
      objectMode: true,
      final: async (callback) => {
        const e = await this.#dispatchTransfer('assets', null);
        callback(e);
      },
      write: async (asset: IAsset, _encoding, callback) => {
        const { filename, filepath, stats, stream } = asset;
        const assetID = v4();

        await this.#dispatchTransfer('assets', {
          step: 'start',
          assetID,
          data: { filename, filepath, stats },
        });

        for await (const chunk of stream) {
          await this.#dispatchTransfer('assets', {
            step: 'stream',
            assetID,
            data: { chunk },
          });
        }

        await this.#dispatchTransfer('assets', {
          step: 'end',
          assetID,
        });

        callback();
      },
    });
  }
}
