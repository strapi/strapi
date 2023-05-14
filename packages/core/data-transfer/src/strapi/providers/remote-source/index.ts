import { PassThrough, Readable } from 'stream';
import { WebSocket } from 'ws';

import type {
  IAsset,
  IMetadata,
  ISourceProvider,
  ISourceProviderTransferResults,
  MaybePromise,
  ProviderType,
  TransferStage,
} from '../../../../types';
import { client, server } from '../../../../types/remote/protocol';
import {
  ProviderInitializationError,
  ProviderTransferError,
  ProviderValidationError,
} from '../../../errors/providers';
import { TRANSFER_PATH } from '../../remote/constants';
import { ILocalStrapiSourceProviderOptions } from '../local-source';
import { createDispatcher, connectToWebsocket, trimTrailingSlash } from '../utils';

interface ITransferTokenAuth {
  type: 'token';
  token: string;
}

export interface IRemoteStrapiSourceProviderOptions extends ILocalStrapiSourceProviderOptions {
  url: URL;
  auth?: ITransferTokenAuth;
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

      if (ended) {
        await this.#respond(uuid);
        await this.#endStep(stage);

        stream.end();
        return;
      }

      if (error) {
        await this.#respond(uuid);
        await this.#endStep(stage);
        stream.destroy(error);
        return;
      }

      stream.push(data);

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

  async createAssetsReadStream(): Promise<Readable> {
    const assets: { [filename: string]: Readable } = {};

    const stream = await this.#createStageReadStream('assets');
    const pass = new PassThrough({ objectMode: true });

    stream
      .on(
        'data',
        (asset: Omit<IAsset, 'stream'> & { chunk: { type: 'Buffer'; data: Uint8Array } }) => {
          const { chunk, ...rest } = asset;

          if (!(asset.filename in assets)) {
            const assetStream = new PassThrough();
            assets[asset.filename] = assetStream;

            pass.push({ ...rest, stream: assetStream });
          }

          if (asset.filename in assets) {
            // The buffer has gone through JSON operations and is now of shape { type: "Buffer"; data: UInt8Array }
            // We need to transform it back into a Buffer instance
            assets[asset.filename].push(Buffer.from(chunk.data));
          }
        }
      )
      .on('end', () => {
        Object.values(assets).forEach((s) => {
          s.push(null);
        });
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
    return new Promise<string>((resolve, reject) => {
      this.ws
        ?.on('unexpected-response', (_req, res) => {
          if (res.statusCode === 401) {
            return reject(
              new ProviderInitializationError(
                'Failed to initialize the connection: Authentication Error'
              )
            );
          }

          if (res.statusCode === 403) {
            return reject(
              new ProviderInitializationError(
                'Failed to initialize the connection: Authorization Error'
              )
            );
          }

          if (res.statusCode === 404) {
            return reject(
              new ProviderInitializationError(
                'Failed to initialize the connection: Data transfer is not enabled on the remote host'
              )
            );
          }

          return reject(
            new ProviderInitializationError(
              `Failed to initialize the connection: Unexpected server response ${res.statusCode}`
            )
          );
        })
        ?.once('open', async () => {
          const query = this.dispatcher?.dispatchCommand({
            command: 'init',
          });

          const res = (await query) as server.Payload<server.InitMessage>;

          if (!res?.transferID) {
            return reject(
              new ProviderTransferError('Init failed, invalid response from the server')
            );
          }

          resolve(res.transferID);
        })
        .once('error', reject);
    });
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
    this.dispatcher = createDispatcher(this.ws);
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

  async getSchemas(): Promise<Strapi.Schemas | null> {
    const schemas =
      (await this.dispatcher?.dispatchTransferAction<Strapi.Schemas>('getSchemas')) ?? null;

    return schemas;
  }

  async #startStep<T extends client.TransferPullStep>(step: T) {
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

  async #endStep<T extends client.TransferPullStep>(step: T) {
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
