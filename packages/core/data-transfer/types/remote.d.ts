import type { ILocalStrapiDestinationProviderOptions } from '../lib';
import type { IAsset, IConfiguration, IEntity, ILink } from './common-entities';

/**
 * Utils
 */

type EmptyObject = Record<string, never>;

/**
 * Messages
 */

export type Message = { uuid: string | null | undefined } & (
  | InitMessage
  | ActionMessage
  | PushTransferMessage
  | TeardownMessage
);

export type MessageType = Message['type'];
export type TransferKind = InitMessage['kind'];
export type PushTransferStage = PushTransferMessage['stage'];

/**
 * Init
 */

// init should return a transfer ID used in the teardown
export type InitMessage = { type: 'init' } & (
  | { kind: 'pull'; options: EmptyObject }
  | { kind: 'push'; options: Pick<ILocalStrapiDestinationProviderOptions, 'strategy' | 'restore'> }
);

/**
 * Action
 */

export type ActionMessage = { type: 'action' } & (
  | { action: 'getMetadata'; options: EmptyObject }
  | { action: 'getSchemas'; options: EmptyObject }
  | { action: 'bootstrap'; options: EmptyObject }
  | { action: 'close'; options: EmptyObject }
  | { action: 'beforeTransfer'; options: EmptyObject }
);

/**
 * Transfer
 */

export type PushTransferMessage = {
  type: 'transfer';
} & (
  | PushEntitiesTransferMessage
  | PushLinksTransferMessage
  | PushConfigurationTransferMessage
  | PushAssetTransferMessage
);

export type PushEntitiesTransferMessage = {
  stage: 'entities';
  data: IEntity | null;
};

export type PushLinksTransferMessage = { stage: 'links'; data: ILink | null };

export type PushConfigurationTransferMessage = {
  stage: 'configuration';
  data: IConfiguration | null;
};

export type PushAssetTransferMessage = {
  stage: 'assets';
  data:
    | ({ assetID: string } & (
        | { step: 'start'; data: Omit<IAsset, 'stream'> }
        | { step: 'stream'; data: { chunk: { type: 'Buffer'; data: number[] } } }
        | { step: 'end'; data: EmptyObject }
      ))
    | null;
};

/**
 * Teardown
 */

export type TeardownMessage = {
  type: 'teardown';
  transferID: string;
};
