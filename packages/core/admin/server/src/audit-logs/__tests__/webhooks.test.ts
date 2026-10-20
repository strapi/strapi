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
        url: 'https://example.com',
        events: ['entry.create', 'entry.update'],
        headers: ['Authorization', 'X-Env'],
        body: null,
        bodyMode: 'merge',
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
  test('keeps scheme and host of the url only', () => {
    const audited = toAuditedWebhook({
      ...webhook,
      url: 'https://user:s3cretpw@hooks.example.com:8443/services/T1/B2/xyz?token=qt0ken#frag',
    });

    expect(audited.url).toBe('https://hooks.example.com:8443');
    expect(JSON.stringify(audited)).not.toMatch(/s3cretpw|xyz|qt0ken|frag/);
  });

  test('drops header values and sorts events and header names', () => {
    expect(toAuditedWebhook(webhook)).toEqual({
      webhookId: '4',
      name: 'Deploy site',
      url: 'https://example.com',
      events: ['entry.create', 'entry.update'],
      headers: ['Authorization', 'X-Env'],
      body: null,
      bodyMode: 'merge',
      isEnabled: true,
    });
  });

  test('records the body mode, merge by default', () => {
    expect(toAuditedWebhook(webhook).bodyMode).toBe('merge');
    expect(toAuditedWebhook({ ...webhook, bodyMode: 'replace' }).bodyMode).toBe('replace');
  });

  test('keeps the sorted top-level keys of the body template only', () => {
    const audited = toAuditedWebhook({
      ...webhook,
      body: { token: 'glptt-s3cret', ref: 'main', variables: { TITLE: '{{ entry.title }}' } },
    });

    expect(audited.body).toEqual(['ref', 'token', 'variables']);
    expect(JSON.stringify(audited)).not.toMatch(/s3cret|main|TITLE/);
  });

  test('records an empty body template as an empty key list, not as the default payload', () => {
    expect(toAuditedWebhook({ ...webhook, body: {} }).body).toEqual([]);
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
      url: { before: 'https://example.com', after: 'https://new.example.com' },
      events: { before: ['entry.create', 'entry.update'], after: ['entry.create'] },
      headers: { added: ['X-Region'], removed: ['X-Env'], changed: ['Authorization'] },
    });
  });

  test('records a url change within the same host, without the path', () => {
    const changes = getWebhookChanges(
      { ...webhook, url: 'https://hooks.example.com/services/old-t0ken' },
      { ...webhook, url: 'https://hooks.example.com/services/new-t0ken' }
    );

    expect(changes).toEqual({
      url: { before: 'https://hooks.example.com', after: 'https://hooks.example.com' },
    });
    expect(JSON.stringify(changes)).not.toMatch(/t0ken/);
  });

  test('records a header whose value changed, without the value', () => {
    const changes = getWebhookChanges(webhook, {
      ...webhook,
      headers: { ...webhook.headers, Authorization: 'Bearer rotated' },
    });

    expect(changes).toEqual({ headers: { added: [], removed: [], changed: ['Authorization'] } });
    expect(JSON.stringify(changes)).not.toMatch(/s3cret|rotated/);
  });

  test('records a switch between the default payload and a body template', () => {
    const custom = { ...webhook, body: { ref: 'main', token: 's3cret' } };

    expect(getWebhookChanges(webhook, custom)).toEqual({
      body: { before: null, after: ['ref', 'token'] },
    });
    expect(getWebhookChanges(custom, webhook)).toEqual({
      body: { before: ['ref', 'token'], after: null },
    });
    expect(JSON.stringify(getWebhookChanges(webhook, custom))).not.toMatch(/s3cret|main/);
  });

  test('records a body value change with the same keys, without the values', () => {
    const changes = getWebhookChanges(
      { ...webhook, body: { ref: 'main' } },
      { ...webhook, body: { ref: 'release' } }
    );

    expect(changes).toEqual({ body: { before: ['ref'], after: ['ref'] } });
    expect(JSON.stringify(changes)).not.toMatch(/main|release/);
  });

  test('records a body mode change', () => {
    const custom = { ...webhook, body: { ref: 'main' } };

    expect(getWebhookChanges(custom, { ...custom, bodyMode: 'replace' })).toEqual({
      bodyMode: { before: 'merge', after: 'replace' },
    });
  });

  test('returns an empty object when only the key order of the body differs', () => {
    expect(
      getWebhookChanges(
        { ...webhook, body: { ref: 'main', inputs: {} } },
        { ...webhook, body: { inputs: {}, ref: 'main' } }
      )
    ).toEqual({});
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
