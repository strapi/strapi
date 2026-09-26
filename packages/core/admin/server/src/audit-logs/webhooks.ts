import { isEqual } from 'lodash/fp';
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
 */
export interface AuditedWebhook extends WebhookEvent {
  url: string;
  events: string[];
  headers: string[];
  isEnabled: boolean;
}

const AUDITED_FIELDS = ['name', 'url', 'events', 'isEnabled'] as const;

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
  headers: HeaderChanges;
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
  headers: sortStrings(Object.keys(webhook.headers ?? {})),
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

export const getWebhookChanges = (previous: Webhook, next: Webhook): WebhookChanges => {
  const before = toAuditedWebhook(previous);
  const after = toAuditedWebhook(next);
  const changes: WebhookChanges = {};

  for (const field of AUDITED_FIELDS) {
    // The url is compared as stored, so a change to its stripped part is recorded too.
    const changed =
      field === 'url' ? previous.url !== next.url : !isEqual(before[field], after[field]);

    if (changed) {
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
        headers: event.headers,
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
