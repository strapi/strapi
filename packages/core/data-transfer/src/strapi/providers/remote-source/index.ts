import { PassThrough, Readable, Writable } from 'stream';
import type { Schema, Utils } from '@strapi/types';
import { WebSocket } from 'ws';
import { castArray } from 'lodash/fp';

import type {
  IAsset,
  IMetadata,
  ISourceProvider,
  ISourceProviderTransferResults,
  MaybePromise,
  Protocol,
  ProviderType,
  TransferStage,
} from '../../../../types';
import { Client, Server, Auth } from '../../../../types/remote/protocol';
import { ProviderTransferError, ProviderValidationError } from '../../../errors/providers';
import { TRANSFER_PATH } from '../../remote/constants';
import { ILocalStrapiSourceProviderOptions } from '../local-source';
import { createDispatcher, connectToWebsocket, trimTrailingSlash } from '../utils';

export interface IRemoteStrapiSourceProviderOptions extends ILocalStrapiSourceProviderOptions {
  url: URL; // the url of the remote Strapi admin
  auth?: Auth.ITransferTokenAuth;
  retryMessageOptions?: {
    retryMessageTimeout: number; // milliseconds to wait for a response from a message
    retryMessageMaxRetries: number; // max number of retries for a message before aborting transfer
  };
}

class RemoteStrapiSourceProvider implements ISourceProvider {
  name = 'source::remote-strapi';

  type: ProviderType = 'source';

  options: IRemoteStrapiSourceProviderOptions;

  ws: WebSocket | null;

  dispatcher: ReturnType<typeof createDispatcher> | null;

  constructor(options: IRemoteStrapiSourceProviderOptions) {
    this.options = options;
    this.ws = null;
    this.dispatcher = null;
  }

  results?: ISourceProviderTransferResults | undefined;

  async #createStageReadStream(stage: Exclude<TransferStage, 'schemas'>) {
    const startResult = await this.#startStep(stage);

    if (startResult instanceof Error) {
      throw startResult;
    }

    const { id: processID } = startResult as { id: string };

    const stream = new PassThrough({ objectMode: true });

    const listener = async (raw: Buffer) => {
      const parsed = JSON.parse(raw.toString());
      // If not a message related to our transfer process, ignore it
      if (!parsed.uuid || parsed?.data?.type !== 'transfer' || parsed?.data?.id !== processID) {
        this.ws?.once('message', listener);
        return;
      }

      const { uuid, data: message } = parsed;
      const { ended, error, data } = message;

      if (error) {
        await this.#respond(uuid);
        stream.destroy(error);
        return;
      }

      if (ended) {
        await this.#respond(uuid);
        await this.#endStep(stage);

        stream.end();
        return;
      }

      // if we get a single items instead of a batch
      // TODO V5: in v5 only allow array
      for (const item of castArray(data)) {
        stream.push(item);
      }

      this.ws?.once('message', listener);

      await this.#respond(uuid);
    };

    this.ws?.once('message', listener);

    return stream;
  }

  createEntitiesReadStream(): MaybePromise<Readable> {
    return this.#createStageReadStream('entities');
  }

  createLinksReadStream(): MaybePromise<Readable> {
    return this.#createStageReadStream('links');
  }

  writeAsync = <T>(stream: Writable, data: T) => {
    return new Promise<void>((resolve, reject) => {
      stream.write(data, (error) => {
        if (error) {
          reject(error);
        }

        resolve();
      });
    });
  };

  async createAssetsReadStream(): Promise<Readable> {
    const assets: {
      [filename: string]: IAsset & {
        stream: PassThrough;
      };
    } = {};

    const stream = await this.#createStageReadStream('assets');
    const pass = new PassThrough({ objectMode: true });

    stream
      .on('data', async (payload: Protocol.Client.TransferAssetFlow[]) => {
        for (const item of payload) {
          const { action } = item;

          // Creates the stream to send the incoming asset through
          if (action === 'start') {
            // Each asset has its own stream identified by its assetID
            assets[item.assetID] = { ...item.data, stream: new PassThrough() };
            await this.writeAsync(pass, assets[item.assetID]);
          }

          // Writes the asset data to the created stream
          else if (action === 'stream') {
            // Converts data into buffer
            const rawBuffer = item.data as unknown as {
              type: 'Buffer';
              data: Uint8Array;
            };
            const chunk = Buffer.from(rawBuffer.data);

            await this.writeAsync(assets[item.assetID].stream, chunk);
          }

          // The asset has been transferred
          else if (action === 'end') {
            await new Promise<void>((resolve, reject) => {
              const { stream: assetStream } = assets[item.assetID];
              assetStream
                .on('close', () => {
                  // Deletes the stream for the asset
                  delete assets[item.assetID];
                  resolve();
                })
                .on('error', reject)
                .end();
            });
          }
        }
      })
      .on('close', () => {
        pass.end();
      });

    return pass;
  }

  createConfigurationReadStream(): MaybePromise<Readable> {
    return this.#createStageReadStream('configuration');
  }

  async getMetadata(): Promise<IMetadata | null> {
    const metadata = await this.dispatcher?.dispatchTransferAction<IMetadata>('getMetadata');

    return metadata ?? null;
  }

  assertValidProtocol(url: URL) {
    const validProtocols = ['https:', 'http:'];

    if (!validProtocols.includes(url.protocol)) {
      throw new ProviderValidationError(`Invalid protocol "${url.protocol}"`, {
        check: 'url',
        details: {
          protocol: url.protocol,
          validProtocols,
        },
      });
    }
  }

  async initTransfer(): Promise<string> {
    const query = this.dispatcher?.dispatchCommand({
      command: 'init',
    });

    const res = (await query) as Server.Payload<Server.InitMessage>;

    if (!res?.transferID) {
      throw new ProviderTransferError('Init failed, invalid response from the server');
    }

    return res.transferID;
  }

  async bootstrap(): Promise<void> {
    const { url, auth } = this.options;
    let ws: WebSocket;
    this.assertValidProtocol(url);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${url.host}${trimTrailingSlash(
      url.pathname
    )}${TRANSFER_PATH}/pull`;

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
    const transferID = await this.initTransfer();

    this.dispatcher.setTransferProperties({ id: transferID, kind: 'pull' });
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

  async getSchemas() {
    const schemas =
      (await this.dispatcher?.dispatchTransferAction<Utils.String.Dict<Schema.Schema>>(
        'getSchemas'
      )) ?? null;

    return schemas;
  }

  async #startStep<T extends Client.TransferPullStep>(step: T) {
    try {
      return await this.dispatcher?.dispatchTransferStep({ action: 'start', step });
    } catch (e) {
      if (e instanceof Error) {
        return e;
      }

      if (typeof e === 'string') {
        return new ProviderTransferError(e);
      }

      return new ProviderTransferError('Unexpected error');
    }
  }

  async #respond(uuid: string) {
    return new Promise((resolve, reject) => {
      this.ws?.send(JSON.stringify({ uuid }), (e) => {
        if (e) {
          reject(e);
        } else {
          resolve(e);
        }
      });
    });
  }

  async #endStep<T extends Client.TransferPullStep>(step: T) {
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
}

export const createRemoteStrapiSourceProvider = (options: IRemoteStrapiSourceProviderOptions) => {
  return new RemoteStrapiSourceProvider(options);
};
