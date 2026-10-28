import { isEqual } from 'lodash';
import type { Modules } from '@strapi/types';

export const AUDITED_EVENTS = {
  WEBHOOK_CREATE: 'webhook.create',
  WEBHOOK_UPDATE: 'webhook.update',
  WEBHOOK_DELETE: 'webhook.delete',
} as const;

type Webhook = Modules.WebhookStore.Webhook;

export interface WebhookEvent {
  webhookId: string;
  name: string;
}

/**
 * The webhook as it may enter a payload: header names only, sorted. Header values
 * carry `Authorization` tokens and are never recorded, not even on the event hub.
 * The body template is recorded as its sorted top-level keys for the same reason
 * (a pipeline token can sit in the body), or `null` for the default payload.
 */
export interface AuditedWebhook extends WebhookEvent {
  url: string;
  events: string[];
  contentTypeEvents: Record<string, string[]>;
  headers: string[];
  body: string[] | null;
  bodyMode: Modules.WebhookStore.BodyMode;
  isEnabled: boolean;
}

const AUDITED_FIELDS = [
  'name',
  'url',
  'events',
  'contentTypeEvents',
  'body',
  'bodyMode',
  'isEnabled',
] as const;

/**
 * Header values are secrets, so the diff lists names only. `changed`: headers whose
 * value changed.
 */
export interface HeaderChanges {
  added: string[];
  removed: string[];
  changed: string[];
}

export type WebhookChanges = Partial<{
  name: Modules.AuditLogs.FieldChange<string>;
  url: Modules.AuditLogs.FieldChange<string>;
  events: Modules.AuditLogs.FieldChange<string[]>;
  contentTypeEvents: Modules.AuditLogs.FieldChange<Record<string, string[]>>;
  headers: HeaderChanges;
  body: Modules.AuditLogs.FieldChange<string[] | null>;
  bodyMode: Modules.AuditLogs.FieldChange<Modules.WebhookStore.BodyMode>;
  isEnabled: Modules.AuditLogs.FieldChange<boolean>;
}>;

export type CreateDetails = Omit<AuditedWebhook, keyof WebhookEvent>;

export interface UpdateDetails {
  changes: WebhookChanges;
}

export type UpdateEvent = WebhookEvent & UpdateDetails;

const sortStrings = (values: string[]): string[] => [...values].sort((a, b) => a.localeCompare(b));

/**
 * Scheme and host only. The rest of a webhook URL is often the credential: userinfo,
 * `?token=`, or a path segment (Slack, Netlify, Discord hooks).
 */
export const toAuditedUrl = (url: string): string => {
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return url.replace(/\/\/[^/@]*@/, '//').match(/^[^:]+:\/\/[^/?#]*/)?.[0] ?? '';
  }
};

export const toAuditedWebhook = (webhook: Webhook): AuditedWebhook => ({
  webhookId: webhook.id,
  name: webhook.name,
  url: toAuditedUrl(webhook.url),
  events: sortStrings(webhook.events ?? []),
  contentTypeEvents: Object.fromEntries(
    sortStrings(Object.keys(webhook.contentTypeEvents ?? {})).map((uid) => [
      uid,
      sortStrings(webhook.contentTypeEvents?.[uid] ?? []),
    ])
  ),
  headers: sortStrings(Object.keys(webhook.headers ?? {})),
  body: webhook.body ? sortStrings(Object.keys(webhook.body)) : null,
  bodyMode: webhook.bodyMode ?? 'merge',
  isEnabled: webhook.isEnabled,
});

const getHeaderChanges = (
  previous: Webhook['headers'],
  next: Webhook['headers']
): HeaderChanges | undefined => {
  const before = previous ?? {};
  const after = next ?? {};
  const names = sortStrings([...new Set([...Object.keys(before), ...Object.keys(after)])]);

  const has = (headers: Webhook['headers'], name: string) => Object.hasOwn(headers, name);

  const changes: HeaderChanges = {
    added: names.filter((name) => !has(before, name)),
    removed: names.filter((name) => !has(after, name)),
    changed: names.filter(
      (name) => has(before, name) && has(after, name) && before[name] !== after[name]
    ),
  };

  return Object.values(changes).some((list) => list.length > 0) ? changes : undefined;
};

/**
 * The url and the body are compared as stored, so a change to their stripped part
 * (the url path, a body value) is recorded too.
 */
const hasChanged = (
  field: (typeof AUDITED_FIELDS)[number],
  [previous, next]: [Webhook, Webhook],
  [before, after]: [AuditedWebhook, AuditedWebhook]
): boolean => {
  switch (field) {
    case 'url':
      return previous.url !== next.url;
    case 'body':
      return !isEqual(previous.body ?? null, next.body ?? null);
    default:
      return !isEqual(before[field], after[field]);
  }
};

export const getWebhookChanges = (previous: Webhook, next: Webhook): WebhookChanges => {
  const before = toAuditedWebhook(previous);
  const after = toAuditedWebhook(next);
  const changes: WebhookChanges = {};

  for (const field of AUDITED_FIELDS) {
    if (hasChanged(field, [previous, next], [before, after])) {
      (changes as Record<string, unknown>)[field] = { before: before[field], after: after[field] };
    }
  }

  const headers = getHeaderChanges(previous.headers, next.headers);

  if (headers) {
    changes.headers = headers;
  }

  return changes;
};

/**
 * The part of the audit-logs lifecycle service used here.
 * The full service type lives in the Admin EE package.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>
  ): void;
}

export const registerWebhookAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const webhookResource = (event: WebhookEvent): Modules.AuditLogs.Resource => ({
    type: 'webhook',
    id: event.webhookId,
    name: event.name,
  });

  auditLogsLifecycle.registerEvent<CreateDetails>(
    AUDITED_EVENTS.WEBHOOK_CREATE,
    (event: AuditedWebhook) => ({
      resource: webhookResource(event),
      details: {
        url: event.url,
        events: event.events,
        contentTypeEvents: event.contentTypeEvents,
        headers: event.headers,
        body: event.body,
        bodyMode: event.bodyMode,
        isEnabled: event.isEnabled,
      },
    })
  );

  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.WEBHOOK_UPDATE,
    (event: UpdateEvent) => ({
      resource: webhookResource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent<undefined>(
    AUDITED_EVENTS.WEBHOOK_DELETE,
    (event: WebhookEvent) => ({
      resource: webhookResource(event),
    })
  );
};
