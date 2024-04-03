import { randomUUID } from 'crypto';
import { Writable, PassThrough } from 'stream';
import type { Core } from '@strapi/types';

import type { TransferFlow, Step } from '../flows';
import type { TransferStage, IAsset, Protocol } from '../../../../types';

import { ProviderTransferError } from '../../../errors/providers';
import { createLocalStrapiDestinationProvider } from '../../providers';
import { createFlow, DEFAULT_TRANSFER_FLOW } from '../flows';
import { Handler } from './abstract';
import { handlerControllerFactory, isDataTransferMessage } from './utils';

const VALID_TRANSFER_ACTIONS = [
  'bootstrap',
  'close',
  'rollback',
  'beforeTransfer',
  'getMetadata',
  'getSchemas',
] as const;

type PushTransferAction = (typeof VALID_TRANSFER_ACTIONS)[number];

const TRANSFER_KIND = 'push';

export interface PushHandler extends Handler {
  /**
   * Local Strapi Destination Provider used to write data to the current Strapi instance
   */
  provider?: ReturnType<typeof createLocalStrapiDestinationProvider>;

  /**
   * Holds all the stages' stream for the current transfer handler (one registry per connection)
   */
  streams?: { [stage in TransferStage]?: Writable };

  /**
   * Holds all the transferred assets for the current transfer handler (one registry per connection)
   */
  assets: { [filepath: string]: IAsset & { stream: PassThrough } };

  /**
   * Ochestrate and manage the transfer messages' ordering
   */
  flow?: TransferFlow;

  /**
   * Checks that the given action is a valid push transfer action
   */
  assertValidTransferAction(action: string): asserts action is PushTransferAction;

  /**
   * Create a new writable stream for the given step in the handler's stream registry
   */
  createWritableStreamForStep(step: TransferStage): Promise<void>;

  /**
   * Simple override of the auth verification
   */
  verifyAuth(): Promise<void>;

  /**
   * Callback when receiving a regular transfer message
   */
  onTransferMessage(msg: Protocol.Client.TransferMessage): Promise<unknown> | unknown;

  /**
   * Callback when receiving a transfer action message
   */
  onTransferAction(msg: Protocol.Client.Action): Promise<unknown> | unknown;

  /**
   * Callback when receiving a transfer step message
   */
  onTransferStep(msg: Protocol.Client.TransferPushMessage): Promise<unknown> | unknown;

  /**
   * Start streaming an asset
   */
  streamAsset(
    this: PushHandler,
    payload: Protocol.Client.GetTransferPushStreamData<'assets'>
  ): Promise<void>;

  // Transfer Flow

  /**
   * Try to move to a specific transfer stage & lock the step
   */
  lockTransferStep(stage: TransferStage): void;

  /**
   * Try to move to unlock the current step
   */
  unlockTransferStep(stage: TransferStage): void;

  /**
   * Checks whether it's possible to stream a chunk for the given stage
   */
  assertValidStreamTransferStep(stage: TransferStage): void;
}

const writeAsync = <T>(stream: Writable, data: T) => {
  return new Promise<void>((resolve, reject) => {
    stream.write(data, (error) => {
      if (error) {
        reject(error);
      }

      resolve();
    });
  });
};

export const createPushController = handlerControllerFactory<Partial<PushHandler>>((proto) => ({
  isTransferStarted(this: PushHandler) {
    return proto.isTransferStarted.call(this) && this.provider !== undefined;
  },

  verifyAuth(this: PushHandler) {
    return proto.verifyAuth.call(this, TRANSFER_KIND);
  },

  cleanup(this: PushHandler) {
    proto.cleanup.call(this);

    this.streams = {};
    this.assets = {};

    delete this.flow;
    delete this.provider;
  },

  teardown(this: PushHandler) {
    if (this.provider) {
      this.provider.rollback();
    }

    proto.teardown.call(this);
  },

  assertValidTransfer(this: PushHandler) {
    proto.assertValidTransfer.call(this);

    if (this.provider === undefined) {
      throw new Error('Invalid Transfer Process');
    }
  },

  assertValidTransferAction(this: PushHandler, action: PushTransferAction) {
    if (VALID_TRANSFER_ACTIONS.includes(action)) {
      return;
    }

    throw new ProviderTransferError(`Invalid action provided: "${action}"`, {
      action,
      validActions: Object.keys(VALID_TRANSFER_ACTIONS),
    });
  },

  assertValidStreamTransferStep(this: PushHandler, stage) {
    const currentStep = this.flow?.get();
    const nextStep: Step = { kind: 'transfer', stage };

    if (currentStep?.kind === 'transfer' && !currentStep.locked) {
      throw new ProviderTransferError(
        `You need to initialize the transfer stage (${nextStep}) before starting to stream data`
      );
    }

    if (this.flow?.cannot(nextStep)) {
      throw new ProviderTransferError(`Invalid stage (${nextStep}) provided for the current flow`, {
        step: nextStep,
      });
    }
  },

  async createWritableStreamForStep(this: PushHandler, step: Exclude<TransferStage, 'schemas'>) {
    const mapper = {
      entities: () => this.provider?.createEntitiesWriteStream(),
      links: () => this.provider?.createLinksWriteStream(),
      configuration: () => this.provider?.createConfigurationWriteStream(),
      assets: () => this.provider?.createAssetsWriteStream(),
    };

    if (!(step in mapper)) {
      throw new Error('Invalid transfer step, impossible to create a stream');
    }

    if (!this.streams) {
      throw new Error('Invalid transfer state');
    }

    this.streams[step] = await mapper[step]();
  },

  async onMessage(this: PushHandler, raw) {
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

  async onTransferMessage(this: PushHandler, msg) {
    const { kind } = msg;

    if (kind === 'action') {
      return this.onTransferAction(msg);
    }

    if (kind === 'step') {
      return this.onTransferStep(msg as Protocol.Client.TransferPushMessage);
    }
  },

  lockTransferStep(stage: TransferStage) {
    const currentStep = this.flow?.get();
    const nextStep: Step = { kind: 'transfer', stage };

    if (currentStep?.kind === 'transfer' && currentStep.locked) {
      throw new ProviderTransferError(
        `It's not possible to start a new transfer stage (${stage}) while another one is in progress (${currentStep.stage})`
      );
    }

    if (this.flow?.cannot(nextStep)) {
      throw new ProviderTransferError(`Invalid stage (${stage}) provided for the current flow`, {
        step: nextStep,
      });
    }

    this.flow?.set({ ...nextStep, locked: true });
  },

  unlockTransferStep(stage: TransferStage) {
    const currentStep = this.flow?.get();
    const nextStep: Step = { kind: 'transfer', stage };

    // Cannot unlock if not locked (aka: started)
    if (currentStep?.kind === 'transfer' && !currentStep.locked) {
      throw new ProviderTransferError(
        `You need to initialize the transfer stage (${stage}) before ending it`
      );
    }

    // Cannot unlock if invalid step provided
    if (this.flow?.cannot(nextStep)) {
      throw new ProviderTransferError(`Invalid stage (${stage}) provided for the current flow`, {
        step: nextStep,
      });
    }

    this.flow?.set({ ...nextStep, locked: false });
  },

  async onTransferStep(this: PushHandler, msg) {
    const { step: stage } = msg;

    if (msg.action === 'start') {
      this.lockTransferStep(stage);

      if (this.streams?.[stage] instanceof Writable) {
        throw new Error('Stream already created, something went wrong');
      }

      await this.createWritableStreamForStep(stage);

      return { ok: true };
    }

    if (msg.action === 'stream') {
      this.assertValidStreamTransferStep(stage);

      // Stream operation on the current transfer stage
      const stream = this.streams?.[stage];

      if (!stream) {
        throw new Error('You need to init first');
      }

      // Assets are nested streams
      if (stage === 'assets') {
        return this.streamAsset(msg.data);
      }

      // For all other steps
      await Promise.all(msg.data.map((item) => writeAsync(stream, item)));
    }

    if (msg.action === 'end') {
      this.unlockTransferStep(stage);

      const stream = this.streams?.[stage];

      if (stream && !stream.closed) {
        await new Promise((resolve, reject) => {
          stream.on('close', resolve).on('error', reject).end();
        });
      }

      delete this.streams?.[stage];

      return { ok: true };
    }
  },

  async onTransferAction(this: PushHandler, msg) {
    const { action } = msg;

    this.assertValidTransferAction(action);

    const step: Step = { kind: 'action', action };
    const isStepRegistered = this.flow?.has(step);

    if (isStepRegistered) {
      if (this.flow?.cannot(step)) {
        throw new ProviderTransferError(`Invalid action "${action}" found for the current flow `, {
          action,
        });
      }

      this.flow?.set(step);
    }

    return this.provider?.[action]();
  },

  async streamAsset(this: PushHandler, payload) {
    const assetsStream = this.streams?.assets;

    // TODO: close the stream upon receiving an 'end' event instead
    if (payload === null) {
      this.streams?.assets?.end();
      return;
    }

    for (const item of payload) {
      const { action, assetID } = item;

      if (!assetsStream) {
        throw new Error('Stream not defined');
      }

      if (action === 'start') {
        this.assets[assetID] = { ...item.data, stream: new PassThrough() };
        writeAsync(assetsStream, this.assets[assetID]);
      }

      if (action === 'stream') {
        // The buffer has gone through JSON operations and is now of shape { type: "Buffer"; data: UInt8Array }
        // We need to transform it back into a Buffer instance
        const rawBuffer = item.data as unknown as { type: 'Buffer'; data: Uint8Array };
        const chunk = Buffer.from(rawBuffer.data);
        await writeAsync(this.assets[assetID].stream, chunk);
      }

      if (action === 'end') {
        await new Promise<void>((resolve, reject) => {
          const { stream: assetStream } = this.assets[assetID];
          assetStream
            .on('close', () => {
              delete this.assets[assetID];
              resolve();
            })
            .on('error', reject)
            .end();
        });
      }
    }
  },

  onClose(this: Handler) {
    this.teardown();
  },

  onError(this: Handler, err) {
    this.teardown();
    strapi.log.error(err);
  },

  // Commands

  async init(
    this: PushHandler,
    params: Protocol.Client.GetCommandParams<'init'>
  ): Promise<Protocol.Server.Payload<Protocol.Server.InitMessage>> {
    if (this.transferID || this.provider) {
      throw new Error('Transfer already in progress');
    }

    await this.verifyAuth();

    this.transferID = randomUUID();
    this.startedAt = Date.now();

    this.assets = {};
    this.streams = {};

    this.flow = createFlow(DEFAULT_TRANSFER_FLOW);

    this.provider = createLocalStrapiDestinationProvider({
      ...params.options,
      autoDestroy: false,
      getStrapi: () => strapi as Core.Strapi,
    });

    this.provider.onWarning = (message) => {
      // TODO send a warning message to the client
      strapi.log.warn(message);
    };

    return { transferID: this.transferID };
  },

  async status(this: PushHandler) {
    const isStarted = this.isTransferStarted();

    if (isStarted) {
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

  async end(
    this: PushHandler,
    params: Protocol.Client.GetCommandParams<'end'>
  ): Promise<Protocol.Server.Payload<Protocol.Server.EndMessage>> {
    await this.verifyAuth();

    if (this.transferID !== params?.transferID) {
      throw new ProviderTransferError('Bad transfer ID provided');
    }

    this.cleanup();

    return { ok: true };
  },
}));
