export type CreateTransferMessage<T extends string, U = unknown> = {
  type: 'transfer';
  kind: T;
  id: string;
} & U;
