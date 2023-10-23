import type { IAsset } from '../../../../common-entities';

export type CreateTransferMessage<T extends string, U = unknown> = {
  type: 'transfer';
  kind: T;
  transferID: string;
} & U;

export type TransferAssetFlow = { assetID: string } & (
  | { action: 'start'; data: Omit<IAsset, 'stream'> }
  | { action: 'stream'; data: Buffer }
  | { action: 'end' }
);
