/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

import { errors } from '@strapi/utils';
import type { Database } from '@strapi/database';

const { ValidationError } = errors;

const webhookModel = {
  uid: 'webhook',
  collectionName: 'strapi_webhooks',
  attributes: {
    name: {
      type: 'string',
    },
    url: {
      type: 'text',
    },
    headers: {
      type: 'json',
    },
    events: {
      type: 'json',
    },
    enabled: {
      type: 'boolean',
    },
  },
};

interface DBInput {
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  enabled: boolean;
}

interface DBOutput {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  enabled: boolean;
}

export interface Webhook {
  id: string;
  name: string;
  url: string;
  headers: Record<string, string>;
  events: string[];
  isEnabled: boolean;
}

const toDBObject = (data: Webhook): DBInput => {
  return {
    name: data.name,
    url: data.url,
    headers: data.headers,
    events: data.events,
    enabled: data.isEnabled,
  };
};

const fromDBObject = (row: DBOutput): Webhook => {
  return {
    id: row.id,
    name: row.name,
    url: row.url,
    headers: row.headers,
    events: row.events,
    isEnabled: row.enabled,
  };
};

const webhookEventValidator = async (allowedEvents: Map<string, string>, events: string[]) => {
  const allowedValues = Array.from(allowedEvents.values());

  events.forEach((event) => {
    if (allowedValues.includes(event)) {
      return;
    }

    throw new ValidationError(`Webhook event ${event} is not supported`);
  });
};

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

const createWebhookStore = ({ db }: { db: Database }): WebhookStore => {
  const webhookQueries = db.query('webhook');

  return {
    allowedEvents: new Map([]),
    addAllowedEvent(key, value) {
      this.allowedEvents.set(key, value);
    },
    removeAllowedEvent(key) {
      this.allowedEvents.delete(key);
    },
    listAllowedEvents() {
      return Array.from(this.allowedEvents.keys());
    },
    getAllowedEvent(key) {
      return this.allowedEvents.get(key);
    },
    async findWebhooks() {
      const results = await webhookQueries.findMany();

      return results.map(fromDBObject);
    },
    async findWebhook(id) {
      const result = await webhookQueries.findOne({ where: { id } });
      return result ? fromDBObject(result) : null;
    },
    async createWebhook(data) {
      await webhookEventValidator(this.allowedEvents, data.events);

      return webhookQueries
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },
    async updateWebhook(id, data) {
      await webhookEventValidator(this.allowedEvents, data.events);

      const webhook = await webhookQueries.update({
        where: { id },
        data: toDBObject(data),
      });

      return webhook ? fromDBObject(webhook) : null;
    },
    async deleteWebhook(id) {
      const webhook = await webhookQueries.delete({ where: { id } });
      return webhook ? fromDBObject(webhook) : null;
    },
  };
};

export { webhookModel, createWebhookStore };
