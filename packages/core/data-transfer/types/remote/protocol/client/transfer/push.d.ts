import type { CreateTransferMessage } from './utils';
import type { IEntity, ILink, IConfiguration, IAsset } from '../../../../common-entities';

export type TransferPushMessage = CreateTransferMessage<
  'step',
  | TransferStepCommands<'entities', IEntity[]>
  | TransferStepCommands<'links', ILink[]>
  | TransferStepCommands<'configuration', IConfiguration[]>
  | TransferStepCommands<'assets', TransferAssetFlow[] | null>
>;

export type GetTransferPushStreamData<T extends TransferPushStep> = {
  [key in TransferPushStep]: {
    action: 'stream';
    step: key;
  } & TransferPushMessage;
}[T] extends { data: infer U }
  ? U
  : never;

export type TransferPushStep = TransferPushMessage['step'];

type TransferStepCommands<T extends string, U> = { step: T } & TransferStepFlow<U>;

type TransferStepFlow<U> = { action: 'start' } | { action: 'stream'; data: U } | { action: 'end' };

type TransferAssetFlow = { assetID: string } & (
  | { action: 'start'; data: Omit<IAsset, 'stream'> }
  | { action: 'stream'; data: Buffer }
  | { action: 'end' }
);
