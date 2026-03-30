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
  /** Agreed max batch size when at least one side declared maxBatchSize; omitted in legacy sessions. */
  maxBatchSize?: number;
  /** Authoritative per-message limits (new peers). Old servers omit; use legacy 1 MiB defaults. */
  assetBatchMaxBytes?: number;
  jsonBatchMaxBytes?: number;
}>;
export type EndMessage = OKMessage;
export type StatusMessage = Message<
  | { active: true; kind: TransferKind; startedAt: number; elapsed: number }
  | { active: false; kind: null; startedAt: null; elapsed: null }
>;

export type Payload<T extends Message> = T['data'];
