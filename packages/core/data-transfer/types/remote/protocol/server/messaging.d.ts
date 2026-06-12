import { TransferKind } from '../client';
import type { ServerError } from './error';
import type { Diagnostic } from '../../../../src/utils/diagnostic';

export type Message<T = unknown> = {
  uuid?: string;
  data?: T | null;
  error?: ServerError | null;
  diagnostic?: Diagnostic;
};

// Successful
export type OKMessage = Message<{ ok: true }>;
export type InitMessage = Message<{
  transferID: string;
  checksums?: boolean;
  /**
   * Echoed back by the push handler when the client requests `assetEncoding: 'base64'` and the
   * remote understands the compact base64 wire format. When absent, the client falls back to the
   * legacy `{ type: 'Buffer', data: number[] }` asset-chunk shape so pre-#23479 remotes that do
   * `Buffer.from(item.data.data)` directly can still receive pushes.
   */
  assetEncoding?: 'base64';
}>;
export type EndMessage = OKMessage;
export type StatusMessage = Message<
  | { active: true; kind: TransferKind; startedAt: number; elapsed: number }
  | { active: false; kind: null; startedAt: null; elapsed: null }
>;

export type Payload<T extends Message> = T['data'];
