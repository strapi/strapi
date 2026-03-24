import type { IAsset } from '../../../../common-entities';

export type CreateTransferMessage<T extends string, U = unknown> = {
  type: 'transfer';
  kind: T;
  transferID: string;
} & U;

export type TransferAssetFlow = { assetID: string } & (
  | { action: 'start'; data: Omit<IAsset, 'stream'> }
  /** Legacy in-process / default JSON: Buffer serializes to `{ type: 'Buffer'; data: number[] }` on the wire. */
  | { action: 'stream'; data: Buffer; encoding?: undefined }
  /**
   * Canonical wire form for asset bytes (push + pull). Built with `createTransferAssetStreamChunk`.
   * Decoders also accept legacy Buffer JSON and plain base64 strings without `encoding`.
   */
  | { action: 'stream'; data: string; encoding?: 'base64' }
  | { action: 'end' }
);
