import type { Webhook } from './webhook-store';
import type * as Data from '../data';

export interface Event {
  event: string;
  info: Record<string, unknown>;
  releaseId?: Data.ID;
}
export interface WebhookRunner {
  deleteListener(event: string): void;
  createListener(event: string): void;
  executeListener({ event, info }: Event): Promise<void>;
  run(
    webhook: Webhook,
    event: string,
    info?: Record<string, unknown>
  ): Promise<{ statusCode: number; message?: string }>;
  add(webhook: Webhook): void;
  update(webhook: Webhook): void;
  remove(webhook: Webhook): void;
}
