import type { CreateTransferMessage } from './utils';

export type Action = CreateTransferMessage<'action', { action: string }>;
