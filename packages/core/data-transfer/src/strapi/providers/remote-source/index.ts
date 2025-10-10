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
import type { IDiagnosticReporter } from '../../../utils/diagnostic';
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
  streamTimeout?: number; // milliseconds to wait between chunks of an asset before aborting the transfer
}

type QueueableAction = Protocol.Client.TransferAssetFlow &
  ({ action: 'stream' } | { action: 'end' });

class RemoteStrapiSourceProvider implements ISourceProvider {
  name = 'source::remote-strapi';

  type: ProviderType = 'source';

  options: IRemoteStrapiSourceProviderOptions;

  ws: WebSocket | null;

  dispatcher: ReturnType<typeof createDispatcher> | null;

  defaultOptions: Partial<IRemoteStrapiSourceProviderOptions> = {
    streamTimeout: 15000,
  };

  constructor(options: IRemoteStrapiSourceProviderOptions) {
    this.options = {
      ...this.defaultOptions,
      ...options,
    };

    this.ws = null;
    this.dispatcher = null;
  }

  results?: ISourceProviderTransferResults | undefined;

  #diagnostics?: IDiagnosticReporter;

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
      // TODO: could we include filename in this for improved logging?
      [assetID: string]: IAsset & {
        stream: PassThrough;
        queue: Array<QueueableAction>;
        status: 'ok' | 'closed' | 'errored';
        timeout?: NodeJS.Timeout;
      };
    } = {};

    // Watch for stalled assets; if we don't receive a chunk within timeout, abort transfer
    const resetTimeout = (assetID: string) => {
      if (assets[assetID].timeout) {
        clearTimeout(assets[assetID].timeout);
      }
      assets[assetID].timeout = setTimeout(() => {
        this.#reportInfo(`Asset ${assetID} transfer stalled, aborting.`);
        assets[assetID].status = 'errored';
        assets[assetID].stream.destroy(new Error(`Asset ${assetID} transfer timed out`));
      }, this.options.streamTimeout);
    };

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
            // if a transfer has already been started for the same asset ID, something is wrong
            if (assets[assetID]) {
              throw new Error(`Asset ${assetID} already started`);
            }

            this.#reportInfo(`Asset ${assetID} starting`);
            // Register the asset
            assets[assetID] = {
              ...item.data,
              stream: new PassThrough(),
              status: 'ok',
              queue: [],
            };

            resetTimeout(assetID);

            // Connect the individual asset stream to the main asset stage stream
            // Note: nothing is transferred until data chunks are fed to the asset stream
            await this.writeAsync(pass, assets[assetID]);
          }

          // Writes the asset's data chunks to their corresponding stream
          // "end" is considered a chunk, but it's not a data chunk, it's a control message
          // That is done so that we don't complicate the already complicated async processing of the queue
          else if (action === 'stream' || action === 'end') {
            // If the asset hasn't been registered, or if it's been closed already, something is wrong
            if (!assets[assetID]) {
              throw new Error(`No id matching ${assetID} for stream action`);
            }

            // On every action, reset the timeout timer
            if (action === 'stream') {
              resetTimeout(assetID);
            } else {
              clearTimeout(assets[assetID].timeout);
            }

            if (assets[assetID].status === 'closed') {
              throw new Error(`Asset ${assetID} is closed`);
            }

            assets[assetID].queue.push(item);
          }
        }

        // each new payload will start new processQueue calls, which may cause some extra calls
        // it's essentially saying "start processing this asset again, I added more data to the queue"
        for (const assetID in assets) {
          if (Object.prototype.hasOwnProperty.call(assets, assetID)) {
            const asset = assets[assetID];
            if (asset.queue?.length > 0) {
              await processQueue(assetID);
            }
          }
        }
      })
      .on('close', () => {
        pass.end();
      });

    /**
     * Start processing the queue for a given assetID
     *
     * Even though this is a loop that attempts to process the entire queue, it is safe to call this more than once
     * for the same asset id because the queue is shared globally, the items are shifted off, and immediately written
     */
    const processQueue = async (id: string) => {
      if (!assets[id]) {
        throw new Error(`Failed to write asset chunk for "${id}". Asset not found.`);
      }

      const asset = assets[id];
      const { status: currentStatus } = asset;

      if (['closed', 'errored'].includes(currentStatus)) {
        throw new Error(
          `Failed to write asset chunk for "${id}". The asset is currently "${currentStatus}"`
        );
      }

      while (asset.queue.length > 0) {
        const data = asset.queue.shift();

        if (!data) {
          throw new Error(`Invalid chunk found for ${id}`);
        }

        try {
          // if this is an end chunk, close the asset stream
          if (data.action === 'end') {
            this.#reportInfo(`Ending asset stream for ${id}`);
            await closeAssetStream(id);
            break; // Exit the loop after closing the stream
          }

          // Save the current chunk
          await writeChunkToStream(id, data);
        } catch {
          if (!assets[id]) {
            throw new Error(`No id matching ${id} for writeAssetChunk`);
          }
        }
      }
    };

    /**
     * Writes a chunk of data to the asset's stream.
     *
     * Only check if the targeted asset exists, no other validation is done.
     */
    const writeChunkToStream = async (id: string, data: unknown) => {
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
            resolve();
          })
          .on('error', (e) => {
            assets[id].status = 'errored';
            reject(new Error(`Failed to close asset "${id}". Asset stream error: ${e.toString()}`));
          })
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

  #reportInfo(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'remote-source-provider',
      },
      kind: 'info',
    });
  }

  async bootstrap(diagnostics?: IDiagnosticReporter): Promise<void> {
    this.#diagnostics = diagnostics;
    const { url, auth } = this.options;
    let ws: WebSocket;
    this.assertValidProtocol(url);
    const wsProtocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${url.host}${trimTrailingSlash(
      url.pathname
    )}${TRANSFER_PATH}/pull`;

    this.#reportInfo('establishing websocket connection');
    // No auth defined, trying public access for transfer
    if (!auth) {
      ws = await connectToWebsocket(wsUrl, undefined, this.#diagnostics);
    }

    // Common token auth, this should be the main auth method
    else if (auth.type === 'token') {
      const headers = { Authorization: `Bearer ${auth.token}` };
      ws = await connectToWebsocket(wsUrl, { headers }, this.#diagnostics);
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

    this.#reportInfo('established websocket connection');
    this.ws = ws;
    const { retryMessageOptions } = this.options;

    this.#reportInfo('creating dispatcher');
    this.dispatcher = createDispatcher(this.ws, retryMessageOptions, (message: string) =>
      this.#reportInfo(message)
    );
    this.#reportInfo('creating dispatcher');

    this.#reportInfo('initialize transfer');
    const transferID = await this.initTransfer();
    this.#reportInfo(`initialized transfer ${transferID}`);

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
