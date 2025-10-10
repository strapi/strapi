/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

import { errors } from '@strapi/utils';
import type { Model, Database } from '@strapi/database';
import type { Modules } from '@strapi/types';

const { ValidationError } = errors;

const webhookModel: Model = {
  uid: 'strapi::webhook',
  singularName: 'strapi_webhooks',
  tableName: 'strapi_webhooks',
  attributes: {
    id: {
      type: 'increments',
    },
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

type Webhook = Modules.WebhookStore.Webhook;
type DBOutput = Omit<Webhook, 'id' | 'isEnabled'> & { id: string | number; enabled: boolean };
type DBInput = Omit<DBOutput, 'id'>;

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
    id: typeof row.id === 'number' ? row.id.toString() : row.id,
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
  return {
    allowedEvents: new Map([
      ['ENTRY_CREATE', 'entry.create'],
      ['ENTRY_UPDATE', 'entry.update'],
      ['ENTRY_DELETE', 'entry.delete'],
      ['ENTRY_PUBLISH', 'entry.publish'],
      ['ENTRY_UNPUBLISH', 'entry.unpublish'],
      ['ENTRY_DRAFT_DISCARD', 'entry.draft-discard'],
    ]),
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
      const results = await db.query('strapi::webhook').findMany();

      return results.map(fromDBObject);
    },
    async findWebhook(id) {
      const result = await db.query('strapi::webhook').findOne({ where: { id } });
      return result ? fromDBObject(result) : null;
    },
    async createWebhook(data) {
      await webhookEventValidator(this.allowedEvents, data.events);

      return db
        .query('strapi::webhook')
        .create({
          data: toDBObject({ ...data, isEnabled: true }),
        })
        .then(fromDBObject);
    },
    async updateWebhook(id, data) {
      await webhookEventValidator(this.allowedEvents, data.events);

      const webhook = await db.query('strapi::webhook').update({
        where: { id },
        data: toDBObject(data),
      });

      return webhook ? fromDBObject(webhook) : null;
    },
    async deleteWebhook(id) {
      const webhook = await db.query('strapi::webhook').delete({ where: { id } });
      return webhook ? fromDBObject(webhook) : null;
    },
  };
};

export { webhookModel, createWebhookStore };
