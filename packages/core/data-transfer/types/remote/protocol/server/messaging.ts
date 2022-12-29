import type { ServerError } from './error';

export type Message<T = unknown> = {
  id?: string;
  data?: T | null;
  error?: ServerError | null;
};

// Successful
export type OK = Message<{ ok: true }>;
