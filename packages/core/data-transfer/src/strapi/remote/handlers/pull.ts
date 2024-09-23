import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import type { Core } from '@strapi/types';

import { Handler } from './abstract';
import { handlerControllerFactory, isDataTransferMessage } from './utils';
import { createLocalStrapiSourceProvider, ILocalStrapiSourceProvider } from '../../providers';
import { ProviderTransferError } from '../../../errors/providers';
import type { IAsset, TransferStage, Protocol } from '../../../../types';
import { Client } from '../../../../types/remote/protocol';

const TRANSFER_KIND = 'pull';
const VALID_TRANSFER_ACTIONS = ['bootstrap', 'close', 'getMetadata', 'getSchemas'] as const;

type PullTransferAction = (typeof VALID_TRANSFER_ACTIONS)[number];

export interface PullHandler extends Handler {
  provider?: ILocalStrapiSourceProvider;

  streams?: { [stage in TransferStage]?: Readable };

  assertValidTransferAction(action: string): asserts action is PullTransferAction;

  onTransferMessage(msg: Protocol.Client.TransferMessage): Promise<unknown> | unknown;
  onTransferAction(msg: Protocol.Client.Action): Promise<unknown> | unknown;
  onTransferStep(msg: Protocol.Client.TransferPullMessage): Promise<unknown> | unknown;

  createReadableStreamForStep(step: TransferStage): Promise<void>;

  flush(stage: TransferStage, id: string): Promise<void> | void;
}

export const createPullController = handlerControllerFactory<Partial<PullHandler>>((proto) => ({
  isTransferStarted(this: PullHandler) {
    return proto.isTransferStarted.call(this) && this.provider !== undefined;
  },

  verifyAuth(this: PullHandler) {
    return proto.verifyAuth.call(this, TRANSFER_KIND);
  },

  cleanup(this: PullHandler) {
    proto.cleanup.call(this);

    this.streams = {};

    delete this.provider;
  },

  assertValidTransferAction(this: PullHandler, action) {
    // Abstract the constant to string[] to allow looser check on the given action
    const validActions = VALID_TRANSFER_ACTIONS as unknown as string[];

    if (validActions.includes(action)) {
      return;
    }

    throw new ProviderTransferError(`Invalid action provided: "${action}"`, {
      action,
      validActions: Object.keys(VALID_TRANSFER_ACTIONS),
    });
  },

  async onMessage(this: PullHandler, raw) {
    const msg = JSON.parse(raw.toString());

    if (!isDataTransferMessage(msg)) {
      return;
    }

    if (!msg.uuid) {
      await this.respond(undefined, new Error('Missing uuid in message'));
    }

    if (proto.hasUUID(msg.uuid)) {
      const previousResponse = proto.response;
      if (previousResponse?.uuid === msg.uuid) {
        await this.respond(previousResponse?.uuid, previousResponse.e, previousResponse.data);
      }
      return;
    }

    const { uuid, type } = msg;
    proto.addUUID(uuid);
    // Regular command message (init, end, status)
    if (type === 'command') {
      const { command } = msg;

      await this.executeAndRespond(uuid, () => {
        this.assertValidTransferCommand(command);

        // The status command don't have params
        if (command === 'status') {
          return this.status();
        }

        return this[command](msg.params);
      });
    }

    // Transfer message (the transfer must be init first)
    else if (type === 'transfer') {
      await this.executeAndRespond(uuid, async () => {
        await this.verifyAuth();

        this.assertValidTransfer();

        return this.onTransferMessage(msg);
      });
    }

    // Invalid messages
    else {
      await this.respond(uuid, new Error('Bad Request'));
    }
  },

  async onTransferMessage(this: PullHandler, msg) {
    const { kind } = msg;

    if (kind === 'action') {
      return this.onTransferAction(msg);
    }

    if (kind === 'step') {
      return this.onTransferStep(msg as Protocol.Client.TransferPullMessage);
    }
  },

  async onTransferAction(this: PullHandler, msg) {
    const { action } = msg;

    this.assertValidTransferAction(action);

    return this.provider?.[action]();
  },

  async flush(this: PullHandler, stage: Client.TransferPullStep, id) {
    type Stage = typeof stage;
    const batchSize = 1024 * 1024;
    let batch = [] as Client.GetTransferPullStreamData<Stage>;
    const stream = this.streams?.[stage];

    const batchLength = () => Buffer.byteLength(JSON.stringify(batch));
    const sendBatch = async () => {
      await this.confirm({
        type: 'transfer',
        data: batch,
        ended: false,
        error: null,
        id,
      });
    };

    if (!stream) {
      throw new ProviderTransferError(`No available stream found for ${stage}`);
    }

    try {
      for await (const chunk of stream) {
        if (stage !== 'assets') {
          batch.push(chunk);
          if (batchLength() >= batchSize) {
            await sendBatch();
            batch = [];
          }
        } else {
          await this.confirm({
            type: 'transfer',
            data: [chunk],
            ended: false,
            error: null,
            id,
          });
        }
      }

      if (batch.length > 0 && stage !== 'assets') {
        await sendBatch();
        batch = [];
      }
      await this.confirm({ type: 'transfer', data: null, ended: true, error: null, id });
    } catch (e) {
      await this.confirm({ type: 'transfer', data: null, ended: true, error: e, id });
    }
  },

  async onTransferStep(this: PullHandler, msg) {
    const { step, action } = msg;

    if (action === 'start') {
      if (this.streams?.[step] instanceof Readable) {
        throw new Error('Stream already created, something went wrong');
      }

      const flushUUID = randomUUID();

      await this.createReadableStreamForStep(step);
      this.flush(step, flushUUID);

      return { ok: true, id: flushUUID };
    }

    if (action === 'end') {
      const stream = this.streams?.[step];

      if (stream?.readableEnded === false) {
        await new Promise((resolve) => {
          stream?.on('close', resolve).destroy();
        });
      }

      delete this.streams?.[step];

      return { ok: true };
    }
  },

  async createReadableStreamForStep(this: PullHandler, step: Exclude<TransferStage, 'schemas'>) {
    const mapper = {
      entities: () => this.provider?.createEntitiesReadStream(),
      links: () => this.provider?.createLinksReadStream(),
      configuration: () => this.provider?.createConfigurationReadStream(),
      assets: () => {
        const assets = this.provider?.createAssetsReadStream();
        let batch: Protocol.Client.TransferAssetFlow[] = [];

        const batchLength = () => {
          return batch.reduce(
            (acc, chunk) => (chunk.action === 'stream' ? acc + chunk.data.byteLength : acc),
            0
          );
        };

        const BATCH_MAX_SIZE = 1024 * 1024; // 1MB

        if (!assets) {
          throw new Error('bad');
        }
        /**
         * Generates batches of 1MB of data from the assets stream to avoid
         * sending too many small chunks
         *
         * @param stream Assets stream from the local source provider
         */
        async function* generator(stream: Readable) {
          let hasStarted = false;
          let assetID = '';

          for await (const chunk of stream) {
            const { stream: assetStream, ...assetData } = chunk as IAsset;
            if (!hasStarted) {
              assetID = randomUUID();
              // Start the transfer of a new asset
              batch.push({ action: 'start', assetID, data: assetData });
              hasStarted = true;
            }

            for await (const assetChunk of assetStream) {
              // Add the asset data to the batch
              batch.push({ action: 'stream', assetID, data: assetChunk });

              // if the batch size is bigger than BATCH_MAX_SIZE stream the batch
              if (batchLength() >= BATCH_MAX_SIZE) {
                yield batch;
                batch = [];
              }
            }

            // All the asset data has been streamed and gets ready for the next one
            hasStarted = false;
            batch.push({ action: 'end', assetID });
            yield batch;
            batch = [];
          }
        }

        return Readable.from(generator(assets));
      },
    };

    if (!(step in mapper)) {
      throw new Error('Invalid transfer step, impossible to create a stream');
    }

    if (!this.streams) {
      throw new Error('Invalid transfer state');
    }

    this.streams[step] = await mapper[step]();
  },

  // Commands
  async init(this: PullHandler) {
    if (this.transferID || this.provider) {
      throw new Error('Transfer already in progress');
    }
    await this.verifyAuth();

    this.transferID = randomUUID();
    this.startedAt = Date.now();

    this.streams = {};

    this.provider = createLocalStrapiSourceProvider({
      autoDestroy: false,
      getStrapi: () => strapi as Core.Strapi,
    });

    return { transferID: this.transferID };
  },

  async end(
    this: PullHandler,
    params: Protocol.Client.GetCommandParams<'end'>
  ): Promise<Protocol.Server.Payload<Protocol.Server.EndMessage>> {
    await this.verifyAuth();

    if (this.transferID !== params?.transferID) {
      throw new ProviderTransferError('Bad transfer ID provided');
    }

    this.cleanup();

    return { ok: true };
  },

  async status(this: PullHandler) {
    const isStarted = this.isTransferStarted();

    if (!isStarted) {
      const startedAt = this.startedAt as number;
      return {
        active: true,
        kind: TRANSFER_KIND,
        startedAt,
        elapsed: Date.now() - startedAt,
      };
    }
    return { active: false, kind: null, elapsed: null, startedAt: null };
  },
}));
