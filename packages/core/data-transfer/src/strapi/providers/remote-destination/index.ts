import { randomUUID } from 'crypto';
import { Writable } from 'stream';
import { WebSocket } from 'ws';
import { once } from 'lodash/fp';
import type { Struct, Utils } from '@strapi/types';

import { createDispatcher, connectToWebsocket, trimTrailingSlash } from '../utils';

import type { IDestinationProvider, IMetadata, ProviderType, IAsset } from '../../../../types';
import type { Client, Server, Auth } from '../../../../types/remote/protocol';
import type { ILocalStrapiDestinationProviderOptions } from '../local-destination';
import { TRANSFER_PATH } from '../../remote/constants';
import { ProviderTransferError, ProviderValidationError } from '../../../errors/providers';

export interface IRemoteStrapiDestinationProviderOptions
  extends Pick<ILocalStrapiDestinationProviderOptions, 'restore' | 'strategy'> {
  url: URL; // the url of the remote Strapi admin
  auth?: Auth.ITransferTokenAuth;
  retryMessageOptions?: {
    retryMessageTimeout: number; // milliseconds to wait for a response from a message
    retryMessageMaxRetries: number; // max number of retries for a message before aborting transfer
  };
}

const jsonLength = (obj: object) => Buffer.byteLength(JSON.stringify(obj));

class RemoteStrapiDestinationProvider implements IDestinationProvider {
  name = 'destination::remote-strapi';

  type: ProviderType = 'destination';

  options: IRemoteStrapiDestinationProviderOptions;

  ws: WebSocket | null;

  dispatcher: ReturnType<typeof createDispatcher> | null;

  transferID: string | null;

  constructor(options: IRemoteStrapiDestinationProviderOptions) {
    this.options = options;
    this.ws = null;
    this.dispatcher = null;
    this.transferID = null;
  }

  async initTransfer(): Promise<string> {
    const { strategy, restore } = this.options;

    const query = this.dispatcher?.dispatchCommand({
      command: 'init',
      params: { options: { strategy, restore }, transfer: 'push' },
    });

    const res = (await query) as Server.Payload<Server.InitMessage>;
    if (!res?.transferID) {
      throw new ProviderTransferError('Init failed, invalid response from the server');
    }
    return res.transferID;
  }

  #startStepOnce(stage: Client.TransferPushStep) {
    return once(() => this.#startStep(stage));
  }

  async #startStep<T extends Client.TransferPushStep>(step: T) {
    try {
      await this.dispatcher?.dispatchTransferStep({ action: 'start', step });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      if (typeof e === 'string') {
        return new ProviderTransferError(e);
      }

      return new ProviderTransferError('Unexpected error');
    }

    return null;
  }

  async #endStep<T extends Client.TransferPushStep>(step: T) {
    try {
      await this.dispatcher?.dispatchTransferStep({ action: 'end', step });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      if (typeof e === 'string') {
        return new ProviderTransferError(e);
      }

      return new ProviderTransferError('Unexpected error');
    }

    return null;
  }

  async #streamStep<T extends Client.TransferPushStep>(
    step: T,
    data: Client.GetTransferPushStreamData<T>
  ) {
    try {
      await this.dispatcher?.dispatchTransferStep({ action: 'stream', step, data });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      if (typeof e === 'string') {
        return new ProviderTransferError(e);
      }

      return new ProviderTransferError('Unexpected error');
    }

    return null;
  }

  #writeStream(step: Exclude<Client.TransferPushStep, 'assets'>): Writable {
    type Step = typeof step;

    const batchSize = 1024 * 1024; // 1MB;
    const startTransferOnce = this.#startStepOnce(step);

    let batch = [] as Client.GetTransferPushStreamData<Step>;

    const batchLength = () => jsonLength(batch);

    return new Writable({
      objectMode: true,

      final: async (callback) => {
        if (batch.length > 0) {
          const streamError = await this.#streamStep(step, batch);

          batch = [];

          if (streamError) {
            return callback(streamError);
          }
        }
        const e = await this.#endStep(step);

        callback(e);
      },

      write: async (chunk, _encoding, callback) => {
        const startError = await startTransferOnce();
        if (startError) {
          return callback(startError);
        }

        batch.push(chunk);

        if (batchLength() >= batchSize) {
          const streamError = await this.#streamStep(step, batch);

          batch = [];

          if (streamError) {
            return callback(streamError);
          }
        }

        callback();
      },
    });
  }

  async bootstrap(): Promise<void> {
    const { url, auth } = this.options;
    const validProtocols = ['https:', 'http:'];

    let ws: WebSocket;

    if (!validProtocols.includes(url.protocol)) {
      throw new ProviderValidationError(`Invalid protocol "${url.protocol}"`, {
        check: 'url',
        details: {
          protocol: url.protocol,
          validProtocols,
        },
      });
    }
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${url.host}${trimTrailingSlash(
      url.pathname
    )}${TRANSFER_PATH}/push`;

    // No auth defined, trying public access for transfer
    if (!auth) {
      ws = await connectToWebsocket(wsUrl);
    }

    // Common token auth, this should be the main auth method
    else if (auth.type === 'token') {
      const headers = { Authorization: `Bearer ${auth.token}` };
      ws = await connectToWebsocket(wsUrl, { headers });
    }

    // Invalid auth method provided
    else {
      throw new ProviderValidationError('Auth method not available', {
        check: 'auth.type',
        details: {
          auth: auth.type,
        },
      });
    }

    this.ws = ws;
    const { retryMessageOptions } = this.options;
    this.dispatcher = createDispatcher(this.ws, retryMessageOptions);

    this.transferID = await this.initTransfer();

    this.dispatcher.setTransferProperties({ id: this.transferID, kind: 'push' });

    await this.dispatcher.dispatchTransferAction('bootstrap');
  }

  async close() {
    // Gracefully close the remote transfer process
    if (this.transferID && this.dispatcher) {
      await this.dispatcher.dispatchTransferAction('close');

      await this.dispatcher.dispatchCommand({
        command: 'end',
        params: { transferID: this.transferID },
      });
    }

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

  async rollback() {
    await this.dispatcher?.dispatchTransferAction('rollback');
  }

  getSchemas() {
    if (!this.dispatcher) {
      return Promise.resolve(null);
    }

    return this.dispatcher.dispatchTransferAction<Utils.String.Dict<Struct.Schema>>('getSchemas');
  }

  createEntitiesWriteStream(): Writable {
    return this.#writeStream('entities');
  }

  createLinksWriteStream(): Writable {
    return this.#writeStream('links');
  }

  createConfigurationWriteStream(): Writable {
    return this.#writeStream('configuration');
  }

  createAssetsWriteStream(): Writable | Promise<Writable> {
    let batch: Client.TransferAssetFlow[] = [];
    let hasStarted = false;

    const batchSize = 1024 * 1024; // 1MB;
    const batchLength = () => {
      return batch.reduce(
        (acc, chunk) => (chunk.action === 'stream' ? acc + chunk.data.byteLength : acc),
        0
      );
    };
    const startAssetsTransferOnce = this.#startStepOnce('assets');

    const flush = async () => {
      const streamError = await this.#streamStep('assets', batch);
      batch = [];
      return streamError;
    };

    const safePush = async (chunk: Client.TransferAssetFlow) => {
      batch.push(chunk);

      if (batchLength() >= batchSize) {
        const streamError = await flush();
        if (streamError) {
          throw streamError;
        }
      }
    };

    return new Writable({
      objectMode: true,
      final: async (callback) => {
        if (batch.length > 0) {
          await flush();
        }

        if (hasStarted) {
          const endStepError = await this.#endStep('assets');

          if (endStepError) {
            return callback(endStepError);
          }
        }

        return callback(null);
      },

      async write(asset: IAsset, _encoding, callback) {
        const startError = await startAssetsTransferOnce();
        if (startError) {
          return callback(startError);
        }

        hasStarted = true;

        const assetID = randomUUID();
        const { filename, filepath, stats, stream, metadata } = asset;

        try {
          await safePush({
            action: 'start',
            assetID,
            data: { filename, filepath, stats, metadata },
          });

          for await (const chunk of stream) {
            await safePush({ action: 'stream', assetID, data: chunk });
          }

          await safePush({ action: 'end', assetID });

          callback();
        } catch (error) {
          if (error instanceof Error) {
            callback(error);
          }
        }
      },
    });
  }
}

export const createRemoteStrapiDestinationProvider = (
  options: IRemoteStrapiDestinationProviderOptions
) => {
  return new RemoteStrapiDestinationProvider(options);
};
