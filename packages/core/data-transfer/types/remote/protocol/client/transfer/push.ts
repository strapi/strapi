import type { CreateTransferMessage } from './utils';
import type { IEntity, ILink, IConfiguration, IAsset } from '../../../../common-entities';

export type TransferPushMessage = CreateTransferMessage<
  'step',
  | TransferStepCommands<'entities', IEntity>
  | TransferStepCommands<'links', ILink>
  | TransferStepCommands<'configuration', IConfiguration>
  | TransferStepCommands<'assets', TransferAssetFlow>
>;

type TransferStepCommands<T extends string, U> = { step: T } & TransferStepFlow<U>;

type TransferStepFlow<U> = { action: 'start' } | { action: 'stream'; data: U } | { action: 'end' };

type TransferAssetFlow = { assetID: string } & (
  | { action: 'start'; data: Omit<IAsset, 'stream'> }
  | { action: 'stream'; data: Uint8Array }
  | { action: 'end' }
);
