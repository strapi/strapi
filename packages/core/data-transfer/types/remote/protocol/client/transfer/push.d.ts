import type { CreateTransferMessage, TransferAssetFlow } from './utils';
import type { IEntity, ILink, IConfiguration } from '../../../../common-entities';

export type TransferPushMessage = CreateTransferMessage<
  'step',
  | TransferStepCommands<'entities', IEntity[]>
  | TransferStepCommands<'links', ILink[]>
  | TransferStepCommands<'configuration', IConfiguration[]>
  | TransferStepCommands<'assets', TransferAssetFlow[]>
>;

export type GetTransferPushStreamData<T extends TransferPushStep> = {
  [key in TransferPushStep]: {
    action: 'stream';
    step: key;
  } & TransferPushMessage;
}[T] extends { data: infer U }
  ? U extends any[] // Check if U is already an array
    ? U // If U is an array, keep it as-is
    : U[] // Otherwise, wrap it in an array
  : never;

export type TransferPushStep = TransferPushMessage['step'];

type TransferStepCommands<T extends string, U> = { step: T } & TransferStepFlow<U>;

type TransferStepFlow<U> = { action: 'start' } | { action: 'stream'; data: U } | { action: 'end' };

export type Stats = { started: number; finished: number };
