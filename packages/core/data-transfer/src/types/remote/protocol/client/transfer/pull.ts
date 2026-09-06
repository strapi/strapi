import type { IEntity, ILink, IConfiguration } from '../../../../common-entities';
import { CreateTransferMessage, TransferAssetFlow } from './utils';

export type TransferPullMessage = CreateTransferMessage<
  'step',
  | TransferStepCommands<'entities', IEntity[]>
  | TransferStepCommands<'links', ILink[]>
  | TransferStepCommands<'configuration', IConfiguration[]>
  | TransferStepCommands<'assets', TransferAssetFlow[]>
>;

export type TransferPullStep = TransferPullMessage['step'];

export type GetTransferPullStreamData<T extends TransferPullStep> = {
  [key in TransferPullStep]: {
    action: 'stream';
    step: key;
  } & TransferPullMessage;
}[T] extends { data: infer U }
  ? U
  : never;

type TransferStepCommands<T extends string, U> = { step: T } & TransferStepFlow<U>;

type TransferStepFlow<U> = { action: 'start' } | { action: 'stream'; data: U } | { action: 'end' };
