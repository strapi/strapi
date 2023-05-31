import type { Action } from './action';
import type { TransferPullMessage } from './pull';
import type { TransferPushMessage } from './push';

export * from './action';
export * from './pull';
export * from './push';

export type TransferMessage = { type: 'transfer'; transferID: string } & (
  | Action
  | TransferPushMessage
  | TransferPullMessage
);
