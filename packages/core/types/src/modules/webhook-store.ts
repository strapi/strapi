/**
 * How the body template of a webhook is sent: added to the default payload (`merge`),
 * or in place of it (`replace`).
 */
export type BodyMode = 'merge' | 'replace';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  /**
   * Template of the request body. A string value can reference the payload with `{{ path }}`
   * placeholders, e.g. `{{ event }}` or `{{ entry.title }}`. `null` sends the default payload.
   */
  body?: Record<string, unknown> | null;
  /**
   * Whether the body template is added to the default payload (the default) or replaces it.
   */
  bodyMode?: BodyMode;
  /**
   * Events triggered for a single content type only, by content type UID,
   * e.g. `{ 'api::article.article': ['entry.create'] }`.
   * The events listed in `events` are triggered for every content type.
   */
  contentTypeEvents?: Record<string, string[]>;
  isEnabled: boolean;
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
