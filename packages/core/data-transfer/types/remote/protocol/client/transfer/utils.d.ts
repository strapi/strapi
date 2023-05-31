export type CreateTransferMessage<T extends string, U = unknown> = {
  type: 'transfer';
  kind: T;
  transferID: string;
} & U;
