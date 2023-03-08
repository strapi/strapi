import { Readable, Transform } from 'stream';
import { randomUUID } from 'crypto';

import { Handler, handlerFactory } from './utils';
import { createLocalStrapiSourceProvider, ILocalStrapiSourceProvider } from '../../providers';
import { GetCommandParams } from '../../../../types/remote/protocol/client';
import { server } from '../../../../types/remote/protocol';
import { EndMessage } from '../../../../types/remote/protocol/server';
import { ProviderTransferError } from '../../../errors/providers';
import { IAsset, TransferStage } from '../../../../types';

const TRANSFER_KIND = 'pull';
const VALID_TRANSFER_ACTIONS = ['bootstrap', 'close', 'getMetadata', 'getSchemas'] as const;

type PullTransferAction = (typeof VALID_TRANSFER_ACTIONS)[number];

interface PullHandler extends Handler {
  provider?: ILocalStrapiSourceProvider;

  streams?: { [stage in TransferStage]?: Readable };

  assertValidTransferAction(action: PullTransferAction): asserts action is PullTransferAction;

  onTransferMessage(msg: unknown): Promise<unknown> | unknown;
  onTransferAction(msg: unknown): Promise<unknown> | unknown;
  onTransferStep(msg: unknown): Promise<unknown> | unknown;

  createReadableStreamForStep(step: TransferStage): Promise<void>;

  flush(stage: TransferStage, id: string): Promise<void> | void;
}

const createPullHandler = handlerFactory<Partial<PullHandler>>((proto) => ({
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
    if (VALID_TRANSFER_ACTIONS.includes(action)) {
      return;
    }

    throw new ProviderTransferError(`Invalid action provided: "${action}"`, {
      action,
      validActions: Object.keys(VALID_TRANSFER_ACTIONS),
    });
  },

  async onMessage(this: PullHandler, raw) {
    const msg = JSON.parse(raw.toString());

    if (!msg.uuid) {
      await this.respond(undefined, new Error('Missing uuid in message'));
    }

    const { uuid, type } = msg;

    // Regular command message (init, end, status)
    if (type === 'command') {
      const { command, params } = msg;

      await this.executeAndRespond(uuid, () => {
        this.assertValidTransferCommand(command);

        return this[command](params);
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
    const { kind } = msg as any;

    if (kind === 'action') {
      return this.onTransferAction(msg);
    }

    if (kind === 'step') {
      return this.onTransferStep(msg);
    }
  },

  async onTransferAction(this: PullHandler, msg) {
    const { action } = msg as any;

    this.assertValidTransferAction(action);

    return this.provider?.[action]();
  },

  async flush(this: PullHandler, stage: TransferStage, id) {
    const stream = this.streams?.[stage];

    if (!stream) {
      throw new ProviderTransferError(`No available stream found for ${stage}`);
    }

    try {
      for await (const chunk of stream) {
        await this.confirm({ type: 'transfer', data: chunk, ended: false, error: null, id });
      }

      await this.confirm({ type: 'transfer', data: null, ended: true, error: null, id });
    } catch (e) {
      await this.confirm({ type: 'transfer', data: null, ended: true, error: e, id });
    }
  },

  async onTransferStep(this: PullHandler, msg: { action: 'start' | 'end'; step: TransferStage }) {
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

        if (!assets) {
          throw new Error('bad');
        }

        async function* generator(stream: Readable) {
          for await (const chunk of stream) {
            const { stream: assetStream, ...rest } = chunk as IAsset;

            for await (const assetChunk of assetStream) {
              yield { ...rest, chunk: assetChunk };
            }
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
      getStrapi: () => strapi,
    });

    return { transferID: this.transferID };
  },

  async end(
    this: PullHandler,
    params: GetCommandParams<'end'>
  ): Promise<server.Payload<EndMessage>> {
    await this.verifyAuth();

    if (this.transferID !== params.transferID) {
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

export default createPullHandler;
