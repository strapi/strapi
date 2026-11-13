import type { Webhook } from './webhook-store';
import type * as Data from '../data';
import type * as UID from '../uid';

export interface ReleaseAction {
  uid: UID.ContentType;
  documentId: Data.DocumentID;
  locale?: string;
  event: Event['event'];
}

export interface Event {
  event: string;
  info: Record<string, unknown>;
  releaseId?: Data.ID;
}

/**
 * A webhook URL that one of the `server.webhooks.destinationChecks` options blocks.
 */
export interface BlockedDestination {
  hostname: string;
  /**
   * The address that is blocked: the hostname itself, or one it resolves to
   */
  address: string;
  /**
   * The `server.webhooks.destinationChecks` option that blocks the address
   */
  option: 'blockLoopback' | 'blockPrivateNetworks' | 'blockLinkLocal';
  /**
   * Says what is blocked and which option to set to false to allow it
   */
  message: string;
}

export interface WebhookRunner {
  /**
   * Applies the address checks turned on in `server.webhooks.destinationChecks` to a URL.
   * Resolves to what blocks it, or to undefined when it is allowed.
   */
  checkDestination(url: string): Promise<BlockedDestination | undefined>;
  deleteListener(event: string): void;
  createListener(event: string): void;
  executeListener({ event, info }: Event): Promise<void>;
  /**
   * Sends a webhook. Resolves to the response status, and to its body when it isn't a 2xx.
   * Rejects with an ApplicationError when a destination check blocks the webhook.
   */
  run(
    webhook: Webhook,
    event: string,
    info?: Record<string, unknown>
  ): Promise<{ statusCode: number; message?: string }>;
  add(webhook: Webhook): void;
  update(webhook: Webhook): void;
  remove(webhook: Webhook): void;
}
