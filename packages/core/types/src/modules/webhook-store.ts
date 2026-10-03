export interface Webhook {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  isEnabled: boolean;
  /**
   * Optional secret used to sign the delivery payload with HMAC-SHA256.
   * When set, each delivery includes an `X-Strapi-Signature-256` header so the
   * receiver can verify the request originated from this Strapi instance.
   * When empty/undefined, no signature header is sent (default behaviour).
   */
  secret?: string;
}

export interface WebhookStore {
  allowedEvents: Map<string, string>;
  addAllowedEvent(key: string, value: string): void;
  removeAllowedEvent(key: string): void;
  listAllowedEvents(): string[];
  getAllowedEvent(key: string): string | undefined;
  findWebhooks(): Promise<Webhook[]>;
  findWebhook(id: string): Promise<Webhook | null>;
  createWebhook(data: Webhook): Promise<Webhook>;
  updateWebhook(id: string, data: Webhook): Promise<Webhook | null>;
  deleteWebhook(id: string): Promise<Webhook | null>;
}
