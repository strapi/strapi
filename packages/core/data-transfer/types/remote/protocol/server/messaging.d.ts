import type { ServerError } from './error';

export type Message<T = unknown> = {
  uuid?: string;
  data?: T | null;
  error?: ServerError | null;
};

// Successful
export type OKMessage = Message<{ ok: true }>;
export type InitMessage = Message<{ transferID: string }>;
export type EndMessage = OKMessage;

export type Payload<T extends Message> = T['data'];
