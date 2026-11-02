/**
 * Webhook store is the implementation of webhook storage over the core_store
 */

import _ from 'lodash';
import { errors } from '@strapi/utils';
import type { Model, Database } from '@strapi/database';
import type { Modules } from '@strapi/types';

import { validateWebhookBody } from './webhook-body';

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
    body: {
      type: 'json',
    },
    contentTypeEvents: {
      type: 'json',
    },
    enabled: {
      type: 'boolean',
    },
  },
};

type Webhook = Modules.WebhookStore.Webhook;
type DBOutput = Omit<Webhook, 'id' | 'isEnabled' | 'body' | 'contentTypeEvents'> & {
  id: string | number;
  enabled: boolean;
  // null for the default payload, also for webhooks saved before the body could be customized
  body?: Webhook['body'];
  // null for webhooks saved before events could be selected per content type
  contentTypeEvents?: Webhook['contentTypeEvents'] | null;
};
type DBInput = Omit<DBOutput, 'id'>;

/**
 * Events triggered for every content type don't need to be saved per content type as well.
 */
const toContentTypeEvents = ({ events, contentTypeEvents = {} }: Webhook) => {
  return Object.fromEntries(
    Object.entries(contentTypeEvents)
      .map(([uid, uidEvents]) => [uid, uidEvents.filter((event) => !events.includes(event))])
      .filter(([, uidEvents]) => uidEvents.length > 0)
  );
};

const getEvents = ({ events, contentTypeEvents = {} }: Webhook) => {
  return [...events, ...Object.values(contentTypeEvents).flat()];
};

const toDBObject = (data: Webhook): DBInput => {
  return {
    name: data.name,
    url: data.url,
    headers: data.headers,
    events: data.events,
    body: data.body ?? null,
    contentTypeEvents: toContentTypeEvents(data),
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
    body: row.body ?? null,
    contentTypeEvents: row.contentTypeEvents ?? {},
    isEnabled: row.enabled,
  };
};

const webhookEventValidator = async (allowedEvents: Map<string, string>, events: string[]) => {
  const allowedValues = new Set(Array.from(allowedEvents.values()));

  events.forEach((event) => {
    if (allowedValues.has(event)) {
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

const hasSameBodyAndEvents = (saved: Webhook, data: Webhook) => {
  const pick = ({ body, events, contentTypeEvents }: Webhook) => ({
    body: body ?? null,
    events,
    contentTypeEvents: contentTypeEvents ?? {},
  });

  return _.isEqual(pick(saved), pick(data));
};

interface WebhookStoreOptions {
  db: Database;
  isBodyTemplateEnabled?: () => boolean;
  getContentTypes?: () => Parameters<typeof validateWebhookBody>[1];
}

const createWebhookStore = ({
  db,
  isBodyTemplateEnabled = () => false,
  getContentTypes = () => ({}),
}: WebhookStoreOptions): WebhookStore => {
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
      await webhookEventValidator(this.allowedEvents, getEvents(data));

      if (isBodyTemplateEnabled()) {
        validateWebhookBody(data, getContentTypes());
      }

      const row = toDBObject({ ...data, isEnabled: true });

      return db
        .query('strapi::webhook')
        .create({
          data: isBodyTemplateEnabled() ? row : { ...row, body: null },
        })
        .then(fromDBObject);
    },
    async updateWebhook(id, data) {
      await webhookEventValidator(this.allowedEvents, getEvents(data));

      if (isBodyTemplateEnabled() && data.body) {
        const saved = await this.findWebhook(id);

        // A saved template stays editable once a field it uses is gone: the runner logs it
        if (!saved || !hasSameBodyAndEvents(saved, data)) {
          validateWebhookBody(data, getContentTypes());
        }
      }

      const row = toDBObject(data);

      const webhook = await db.query('strapi::webhook').update({
        where: { id },
        // Without the flag, a saved template is neither sent nor changed
        data: isBodyTemplateEnabled() ? row : _.omit(row, 'body'),
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
