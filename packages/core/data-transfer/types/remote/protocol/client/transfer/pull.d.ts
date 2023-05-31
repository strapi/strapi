import type { IEntity, ILink, IConfiguration } from '../../../../common-entities';
import { CreateTransferMessage } from './utils';

export type TransferPullMessage = CreateTransferMessage<
  'step',
  | TransferStepCommands<'entities', IEntity>
  | TransferStepCommands<'links', ILink>
  | TransferStepCommands<'configuration', IConfiguration>
  | TransferStepCommands<'assets', TransferAssetFlow | null>
>;

export type TransferPullStep = TransferPullMessage['step'];

type TransferStepCommands<T extends string, U> = { step: T } & TransferStepFlow<U>;

type TransferStepFlow<U> = { action: 'start' } | { action: 'stream'; data: U } | { action: 'end' };
