import { getWebhookChanges, registerWebhookAuditEvents, toAuditedWebhook } from '../webhooks';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerWebhookAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

const webhook = {
  id: '4',
  name: 'Deploy site',
  url: 'https://example.com/hook',
  headers: { 'X-Env': 'prod', Authorization: 'Bearer s3cret' },
  events: ['entry.update', 'entry.create'],
  isEnabled: true,
};

describe('webhook audit events', () => {
  test('registers the three webhook events', () => {
    expect(Object.keys(getTransformers()).sort()).toEqual([
      'webhook.create',
      'webhook.delete',
      'webhook.update',
    ]);
  });

  test('webhook.create records the scope with header names only', () => {
    const shape = getTransformers()['webhook.create'](toAuditedWebhook(webhook));

    expect(shape).toEqual({
      resource: { type: 'webhook', id: '4', name: 'Deploy site' },
      details: {
        url: 'https://example.com/hook',
        events: ['entry.create', 'entry.update'],
        headers: ['Authorization', 'X-Env'],
        isEnabled: true,
      },
    });
    expect(JSON.stringify(shape)).not.toMatch(/s3cret|prod/);
  });

  test('webhook.update carries the changes', () => {
    const changes = { url: { before: 'https://a', after: 'https://b' } };

    expect(
      getTransformers()['webhook.update']({ webhookId: '4', name: 'Deploy site', changes })
    ).toEqual({
      resource: { type: 'webhook', id: '4', name: 'Deploy site' },
      details: { changes },
    });
  });

  test('webhook.delete has no details', () => {
    expect(getTransformers()['webhook.delete']({ webhookId: '4', name: 'Deploy site' })).toEqual({
      resource: { type: 'webhook', id: '4', name: 'Deploy site' },
    });
  });
});

describe('toAuditedWebhook', () => {
  test('drops header values and sorts events and header names', () => {
    expect(toAuditedWebhook(webhook)).toEqual({
      webhookId: '4',
      name: 'Deploy site',
      url: 'https://example.com/hook',
      events: ['entry.create', 'entry.update'],
      headers: ['Authorization', 'X-Env'],
      isEnabled: true,
    });
  });
});

describe('getWebhookChanges', () => {
  test('returns an empty object when only the order of events or headers differs', () => {
    expect(
      getWebhookChanges(webhook, {
        ...webhook,
        events: ['entry.create', 'entry.update'],
        headers: { Authorization: 'Bearer s3cret', 'X-Env': 'prod' },
      })
    ).toEqual({});
  });

  test('records only the flipped flag when a full save toggles isEnabled', () => {
    expect(getWebhookChanges(webhook, { ...webhook, isEnabled: false })).toEqual({
      isEnabled: { before: true, after: false },
    });
  });

  test('records name, url, events and the header set diff', () => {
    expect(
      getWebhookChanges(webhook, {
        ...webhook,
        name: 'Deploy staging',
        url: 'https://new.example.com/hook',
        events: ['entry.create'],
        headers: { Authorization: 'Bearer other', 'X-Region': 'eu' },
      })
    ).toEqual({
      name: { before: 'Deploy site', after: 'Deploy staging' },
      url: { before: 'https://example.com/hook', after: 'https://new.example.com/hook' },
      events: { before: ['entry.create', 'entry.update'], after: ['entry.create'] },
      headers: { added: ['X-Region'], removed: ['X-Env'], changed: ['Authorization'] },
    });
  });

  test('records a header whose value changed, without the value', () => {
    const changes = getWebhookChanges(webhook, {
      ...webhook,
      headers: { ...webhook.headers, Authorization: 'Bearer rotated' },
    });

    expect(changes).toEqual({ headers: { added: [], removed: [], changed: ['Authorization'] } });
    expect(JSON.stringify(changes)).not.toMatch(/s3cret|rotated/);
  });

  test('classifies a header named after an Object.prototype member by ownership', () => {
    const withHeader = { ...webhook, headers: { ...webhook.headers, constructor: 'x' } };

    expect(getWebhookChanges(webhook, withHeader)).toEqual({
      headers: { added: ['constructor'], removed: [], changed: [] },
    });
    expect(getWebhookChanges(withHeader, webhook)).toEqual({
      headers: { added: [], removed: ['constructor'], changed: [] },
    });
  });
});
