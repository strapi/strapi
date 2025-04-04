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
export type InitMessage = Message<{ transferID: string }>;
export type EndMessage = OKMessage;
export type StatusMessage = Message<
  | { active: true; kind: TransferKind; startedAt: number; elapsed: number }
  | { active: false; kind: null; startedAt: null; elapsed: null }
>;

export type Payload<T extends Message> = T['data'];
