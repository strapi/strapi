import type { CommandMessage } from './commands';
import type { TransferMessage } from './transfer';

export * from './commands';
export * from './transfer';

export type Message = CommandMessage | TransferMessage;
export type MessageType = Message['type'];
