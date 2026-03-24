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
import { decodeTransferAssetStreamItem } from '../../../utils/transfer-asset-chunk';
import { ILocalStrapiSourceProviderOptions } from '../local-source';
import { createDispatcher, connectToWebsocket, trimTrailingSlash } from '../utils';

export interface IRemoteStrapiSourceProviderOptions extends ILocalStrapiSourceProviderOptions {
  url: URL; // the url of the remote Strapi admin
  auth?: Auth.ITransferTokenAuth;
  retryMessageOptions?: {
    retryMessageTimeout: number; // milliseconds to wait for a response from a message
    retryMessageMaxRetries: number; // max number of retries for a message before aborting transfer
  };
  /** Max ms without forward progress on an asset (new remote chunk accepted or chunk fully handed to the asset stream). */
  streamTimeout?: number;
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
    // Large files + JSON/WS backpressure can go minutes between *messages* while bytes still drain locally
    streamTimeout: 300_000,
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

  #pullAssetStreamWireSampleLogged = false;

  async #createStageReadStream(stage: Exclude<TransferStage, 'schemas'>) {
    const startResult = await this.#startStep(stage);

    if (startResult instanceof Error) {
      throw startResult;
    }

    const { id: processID } = startResult as { id: string };

    // Default object-mode HWM (~16 chunks). Do not await `drain` on manual `push` while `pipe()`
    // is attached — drain/`readableLength` races reliably deadlock after a few 1MiB asset frames.
    // Backpressure for pull assets is enforced by the Writable below (`highWaterMark: 1`).
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

      for (const item of castArray(data)) {
        stream.push(item as Parameters<PassThrough['push']>[0]);
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

    // Watch for stalled assets: no remote chunks and no completed writes to the asset stream for streamTimeout ms
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

    /**
     * Serialize asset batch handling: `Readable.on('data', async …)` does not apply backpressure,
     * so we pipe through a Writable with highWaterMark 1 so only one batch is in flight.
     */
    const processAssetPayload = async (payload: Protocol.Client.TransferAssetFlow[]) => {
      for (const item of payload) {
        const { action, assetID } = item;

        if (action === 'start') {
          if (assets[assetID]) {
            throw new Error(`Asset ${assetID} already started`);
          }

          this.#reportInfo(`Asset ${assetID} starting`);
          assets[assetID] = {
            ...item.data,
            stream: new PassThrough(),
            status: 'ok',
            queue: [],
          };

          resetTimeout(assetID);

          await this.writeAsync(pass, assets[assetID]);
        } else if (action === 'stream' || action === 'end') {
          if (!assets[assetID]) {
            throw new Error(`No id matching ${assetID} for stream action`);
          }

          if (action === 'stream') {
            if (!this.#pullAssetStreamWireSampleLogged) {
              this.#pullAssetStreamWireSampleLogged = true;
              const { data } = item;
              // Same legacy shape `decodeTransferAssetStreamData` accepts after JSON.parse (proof, not frame-size guess).
              const legacyBufferJson =
                data &&
                typeof data === 'object' &&
                !Buffer.isBuffer(data) &&
                (data as { type?: string }).type === 'Buffer' &&
                (Array.isArray((data as { data?: unknown }).data) ||
                  ArrayBuffer.isView((data as { data?: unknown }).data));
              if (legacyBufferJson) {
                this.#reportWarning(
                  '[Data transfer][pull] Remote is using legacy Buffer JSON for asset chunks (each byte as a JSON number). That uses much more memory during JSON.parse than base64. Upgrade the remote Strapi to a version that sends base64 asset chunks, or out-of-memory errors may still happen on large files.'
                );
              }
            }
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

      for (const assetID in assets) {
        if (Object.prototype.hasOwnProperty.call(assets, assetID)) {
          const asset = assets[assetID];
          if (asset.queue?.length > 0) {
            await processQueue(assetID);
          }
        }
      }
    };

    const processor = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(payload: Protocol.Client.TransferAssetFlow[], _encoding, callback) {
        processAssetPayload(payload).then(
          () => {
            callback();
          },
          (err: Error) => {
            stream.destroy(err);
            callback(err);
          }
        );
      },
      final(callback) {
        pass.end();
        callback();
      },
    });

    processor.on('error', (err) => {
      pass.destroy(err);
    });

    stream.on('error', (err) => {
      processor.destroy(err);
      pass.destroy(err);
    });

    stream.pipe(processor);

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
    const writeChunkToStream = async (id: string, item: QueueableAction) => {
      const asset = assets[id];

      if (!asset) {
        throw new Error(`Failed to write asset chunk for "${id}". Asset not found.`);
      }

      if (item.action !== 'stream') {
        throw new Error(`Expected stream queue item for "${id}"`);
      }

      const chunk = decodeTransferAssetStreamItem(item);

      await this.writeAsync(asset.stream, chunk);
      // Count slow draining as progress so backpressure on large chunks does not trip the stall timer
      resetTimeout(id);
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

      const asset = assets[id];
      asset.status = 'closed';

      await new Promise<void>((resolve, reject) => {
        const { stream } = asset;

        stream
          .on('close', () => {
            delete assets[id];
            resolve();
          })
          .on('error', (e) => {
            delete assets[id];
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

  /** Warnings are always emitted by the transfer CLI logger (unlike info, which needs --verbose). */
  #reportWarning(message: string) {
    this.#diagnostics?.report({
      details: {
        createdAt: new Date(),
        message,
        origin: 'remote-source-provider',
      },
      kind: 'warning',
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

    this.#pullAssetStreamWireSampleLogged = false;

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
