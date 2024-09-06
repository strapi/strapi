import { PassThrough, Readable, Writable } from 'stream';
import type { Struct, Utils } from '@strapi/types';
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
import { createDispatcher, connectToWebsocket, trimTrailingSlash, wait, waitUntil } from '../utils';

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
    // Create the streams used to transfer the assets
    const stream = await this.#createStageReadStream('assets');
    const pass = new PassThrough({ objectMode: true });

    // Init the asset map
    const assets: {
      [filename: string]: IAsset & {
        stream: PassThrough;
        queue: Array<Protocol.Client.TransferAssetFlow & { action: 'stream' }>;
        status: 'idle' | 'busy' | 'closed' | 'errored';
      };
    } = {};

    stream
      /**
       * Process a payload of many transfer assets and performs the following tasks:
       * - Start: creates a stream for new assets.
       * - Stream: writes asset chunks to the asset's stream.
       * - End: closes the stream after the asset s transferred and cleanup related resources.
       */
      .on('data', async (payload: Protocol.Client.TransferAssetFlow[]) => {
        for (const item of payload) {
          const { action, assetID } = item;

          // Creates the stream to send the incoming asset through
          if (action === 'start') {
            // Ignore the item if a transfer has already been started for the same asset ID
            if (assets[assetID]) {
              continue;
            }

            // Register the asset
            assets[assetID] = {
              ...item.data,
              stream: new PassThrough(),
              status: 'idle',
              queue: [],
            };

            // Connect the individual asset stream to the main asset stage stream
            // Note: nothing is transferred until data chunks are fed to the asset stream
            await this.writeAsync(pass, assets[assetID]);
          }

          // Writes the asset's data chunks to their corresponding stream
          else if (action === 'stream') {
            // If the asset hasn't been registered, or if it's been closed already, then ignore the message
            if (!assets[assetID]) {
              continue;
            }

            switch (assets[assetID].status) {
              // The asset is ready to accept a new chunk, write it now
              case 'idle':
                await writeAssetChunk(assetID, item.data);
                break;
              // The resource is busy, queue the current chunk so that it gets transferred as soon as possible
              case 'busy':
                assets[assetID].queue.push(item);
                break;
              // Ignore asset chunks for assets with a closed/errored status
              case 'closed':
              case 'errored':
              default:
                break;
            }
          }

          // All the asset chunks have been transferred
          else if (action === 'end') {
            // If the asset has already been closed, or if it was never registered, ignore the command
            if (!assets[assetID]) {
              continue;
            }

            switch (assets[assetID].status) {
              // There's no ongoing activity, the asset is ready to be closed
              case 'idle':
              case 'errored':
                await closeAssetStream(assetID);
                break;
              // The resource is busy, wait for a different state and close the stream.
              case 'busy':
                await Promise.race([
                  // Either: wait for the asset to be ready to be closed
                  waitUntil(() => assets[assetID].status !== 'busy', 100),
                  // Or: if the last chunks are still not processed after ten seconds
                  wait(10000),
                ]);

                await closeAssetStream(assetID);
                break;
              // Ignore commands for assets being currently closed
              case 'closed':
              default:
                break;
            }
          }
        }
      })
      .on('close', () => {
        pass.end();
      });

    /**
     * Writes a chunk of data for the specified asset with the given id.
     */
    const writeAssetChunk = async (id: string, data: unknown) => {
      if (!assets[id]) {
        throw new Error(`Failed to write asset chunk for "${id}". Asset not found.`);
      }

      const { status: currentStatus } = assets[id];

      if (currentStatus !== 'idle') {
        throw new Error(
          `Failed to write asset chunk for "${id}". The asset is currently "${currentStatus}"`
        );
      }

      const nextItemInQueue = () => assets[id].queue.shift();

      try {
        // Lock the asset
        assets[id].status = 'busy';

        // Save the current chunk
        await unsafe_writeAssetChunk(id, data);

        // Empty the queue if needed
        let item = nextItemInQueue();

        while (item) {
          await unsafe_writeAssetChunk(id, item.data);
          item = nextItemInQueue();
        }

        // Unlock the asset
        assets[id].status = 'idle';
      } catch {
        assets[id].status = 'errored';
      }
    };

    /**
     * Writes a chunk of data to the asset's stream.
     *
     * Only check if the targeted asset exists, no other validation is done.
     */
    const unsafe_writeAssetChunk = async (id: string, data: unknown) => {
      const asset = assets[id];

      if (!asset) {
        throw new Error(`Failed to write asset chunk for "${id}". Asset not found.`);
      }

      const rawBuffer = data as { type: 'Buffer'; data: Uint8Array };
      const chunk = Buffer.from(rawBuffer.data);

      await this.writeAsync(asset.stream, chunk);
    };

    /**
     * Closes the asset stream associated with the given ID.
     *
     * It deletes the stream for the asset upon successful closure.
     */
    const closeAssetStream = async (id: string) => {
      if (!assets[id]) {
        throw new Error(`Failed to close asset "${id}". Asset not found.`);
      }

      assets[id].status = 'closed';

      await new Promise<void>((resolve, reject) => {
        const { stream } = assets[id];

        stream
          .on('close', () => {
            delete assets[id];

            resolve();
          })
          .on('error', reject)
          .end();
      });
    };

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
      await this.dispatcher?.dispatchTransferAction<Utils.String.Dict<Struct.Schema>>('getSchemas');

    return schemas ?? null;
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
