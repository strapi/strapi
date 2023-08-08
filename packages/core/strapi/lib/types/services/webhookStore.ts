type EntryEvent = 'entry.create' | 'entry.publish' | 'entry.update' | 'entry.unpublish' | 'entry.delete';
type MediaEvent = 'media.create' | 'media.update' | 'media.delete';
type WebhookEvent = EntryEvent | MediaEvent;

type Webhook = {
  id: number;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: WebhookEvent[];
  isEnabled: boolean;
};

export type WebhookDraft = Omit<Webhook, 'id'> & { id?: number };

export type WebhookStore = {
  findWebhooks: () => Promise<Webhook[]>;
  createWebhook: (webhookDraft: WebhookDraft) => Promise<Webhook>;
  updateWebhook: (id: number, webhookDraft: WebhookDraft) => Promise<Webhook>;
};
