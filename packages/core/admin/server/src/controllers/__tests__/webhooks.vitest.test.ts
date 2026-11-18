import { describe, test, expect, beforeEach, vi, type Mock } from 'vitest';
import { emitAudit, errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import webhooksController from '../webhooks';

vi.mock('@strapi/utils', async () => ({
  ...(await vi.importActual<typeof import('@strapi/utils')>('@strapi/utils')),
  emitAudit: vi.fn(() => Promise.resolve()),
}));

const emitAuditMock = emitAudit as Mock;

const webhook = {
  id: '4',
  name: 'Deploy site',
  url: 'https://example.com/hook',
  headers: { 'X-Env': 'prod', Authorization: 'Bearer s3cret' },
  events: ['entry.update', 'entry.create'],
  isEnabled: true,
};

const body = {
  name: webhook.name,
  url: webhook.url,
  headers: webhook.headers,
  events: webhook.events,
};

const setStrapi = (store: Record<string, Mock>) => {
  const runner = { add: vi.fn(), update: vi.fn(), remove: vi.fn(), run: vi.fn() };
  global.strapi = {
    get: (name: string) => (name === 'webhookStore' ? store : runner),
  } as any;
  return runner;
};

const createCtx = (input: Record<string, unknown>) => ({
  ...createContext(input),
  created: vi.fn(),
  send: vi.fn(),
  notFound: vi.fn(),
  badRequest: vi.fn(),
});

describe('Webhooks controller audit events', () => {
  beforeEach(() => {
    emitAuditMock.mockClear();
  });

  test('createWebhook emits webhook.create with header names only', async () => {
    setStrapi({ createWebhook: vi.fn(async () => webhook) });
    const ctx = createCtx({ body });

    await webhooksController.createWebhook(ctx as any);

    expect(ctx.created).toHaveBeenCalledWith({ data: webhook });
    expect(emitAuditMock).toHaveBeenCalledTimes(1);
    expect(emitAuditMock.mock.calls[0][1]).toBe('webhook.create');
    expect(emitAuditMock.mock.calls[0][2]).toEqual({
      webhookId: '4',
      name: 'Deploy site',
      url: 'https://example.com',
      events: ['entry.create', 'entry.update'],
      contentTypeEvents: {},
      headers: ['Authorization', 'X-Env'],
      isEnabled: true,
    });
    expect(JSON.stringify(emitAuditMock.mock.calls[0][2])).not.toMatch(/s3cret|prod/);
  });

  test('updateWebhook emits webhook.update with the changes', async () => {
    const updated = { ...webhook, url: 'https://new.example.com/hook', isEnabled: false };
    setStrapi({
      findWebhook: vi.fn(async () => webhook),
      updateWebhook: vi.fn(async () => updated),
    });
    const ctx = createCtx({
      params: { id: '4' },
      body: { ...body, url: updated.url, isEnabled: false },
    });

    await webhooksController.updateWebhook(ctx as any);

    expect(ctx.send).toHaveBeenCalledWith({ data: updated });
    expect(emitAuditMock).toHaveBeenCalledTimes(1);
    expect(emitAuditMock.mock.calls[0][1]).toBe('webhook.update');
    expect(emitAuditMock.mock.calls[0][2]).toEqual({
      webhookId: '4',
      name: 'Deploy site',
      changes: {
        url: { before: 'https://example.com', after: 'https://new.example.com' },
        isEnabled: { before: true, after: false },
      },
    });
  });

  test('updateWebhook emits nothing when the saved values are unchanged', async () => {
    setStrapi({
      findWebhook: vi.fn(async () => webhook),
      updateWebhook: vi.fn(async () => ({
        ...webhook,
        events: ['entry.create', 'entry.update'],
      })),
    });
    const ctx = createCtx({ params: { id: '4' }, body });

    await webhooksController.updateWebhook(ctx as any);

    expect(ctx.send).toHaveBeenCalled();
    expect(emitAuditMock).not.toHaveBeenCalled();
  });

  test('deleteWebhook emits webhook.delete', async () => {
    setStrapi({
      findWebhook: vi.fn(async () => webhook),
      deleteWebhook: vi.fn(async () => webhook),
    });
    const ctx = createCtx({ params: { id: '4' } });

    await webhooksController.deleteWebhook(ctx as any);

    expect(emitAuditMock).toHaveBeenCalledTimes(1);
    expect(emitAuditMock.mock.calls[0][1]).toBe('webhook.delete');
    expect(emitAuditMock.mock.calls[0][2]).toEqual({ webhookId: '4', name: 'Deploy site' });
  });

  test('deleteWebhooks emits one webhook.delete per deleted webhook and skips unknown ids', async () => {
    const other = { ...webhook, id: '5', name: 'Other' };
    const byId: Record<string, typeof webhook> = { '4': webhook, '5': other };
    setStrapi({
      findWebhook: vi.fn(async (id: string) => byId[id] ?? null),
      deleteWebhook: vi.fn(async (id: string) => byId[id]),
    });
    const ctx = createCtx({ body: { ids: ['4', '99', '5'] } });

    await webhooksController.deleteWebhooks(ctx as any);

    expect(ctx.send).toHaveBeenCalledWith({ data: ['4', '99', '5'] });
    expect(emitAuditMock.mock.calls.map((call) => [call[1], call[2]])).toEqual([
      ['webhook.delete', { webhookId: '4', name: 'Deploy site' }],
      ['webhook.delete', { webhookId: '5', name: 'Other' }],
    ]);
  });
});

describe('Webhooks controller headers', () => {
  test.each([
    ['an empty value', { 'X-Env': '' }],
    ['a number', { 'X-Env': 5 }],
    ['null', { 'X-Env': null }],
    ['a name with a space', { 'bad header': 'value' }],
    ['a line break in the value', { 'X-Env': 'a\r\nb' }],
    ['a control character in the value', { 'X-Env': 'a\u0001b' }],
    ['a DEL character in the value', { 'X-Env': 'a\u007fb' }],
    ['characters outside latin1 in the value', { 'X-Env': '日本語' }],
    ['an emoji in the value', { 'X-Env': '\u{1F600}' }],
    ['a non-ascii name', { 'X-café': 'value' }],
    ['an empty name', { '': 'value' }],
    ['Content-Length', { 'Content-Length': '5' }],
    ['Expect', { Expect: '100-continue' }],
    ['Keep-Alive', { 'Keep-Alive': 'timeout=5' }],
    ['Transfer-Encoding', { 'Transfer-Encoding': 'chunked' }],
    ['Upgrade', { Upgrade: 'websocket' }],
    ['a different case of an unsupported name', { 'cOnTeNt-LeNgTh': '5' }],
    ['Connection: upgrade', { Connection: 'upgrade' }],
    ['Connection with an unknown value', { connection: 'foo' }],
  ])('createWebhook rejects %s', async (_label, headers) => {
    const createWebhook = vi.fn();
    setStrapi({ createWebhook });
    const ctx = createCtx({ body: { ...body, headers } });

    await expect(webhooksController.createWebhook(ctx as any)).rejects.toThrow(
      errors.ValidationError
    );
    expect(createWebhook).not.toHaveBeenCalled();
  });

  test.each([
    ['a latin1 value', { 'X-Env': 'café' }],
    ['a tab in the value', { 'X-Env': 'a\tb' }],
    ['spaces around the value', { 'X-Env': '  a  ' }],
    ['a name with a dot', { 'X.Custom': 'value' }],
    ['a name that is an Object method', { constructor: 'value', toString: 'value' }],
    ['Connection: close and Host', { Connection: 'close', Host: 'example.com' }],
    ['Connection: keep-alive in another case', { connection: 'Keep-Alive' }],
  ])('createWebhook accepts %s', async (_label, headers) => {
    const createWebhook = vi.fn(async () => webhook);
    setStrapi({ createWebhook });
    const ctx = createCtx({ body: { ...body, headers } });

    await webhooksController.createWebhook(ctx as any);

    expect(createWebhook).toHaveBeenCalled();
  });

  test('createWebhook accepts no headers', async () => {
    const createWebhook = vi.fn(async () => webhook);
    setStrapi({ createWebhook });
    const ctx = createCtx({ body: { ...body, headers: {} } });

    await webhooksController.createWebhook(ctx as any);

    expect(createWebhook).toHaveBeenCalled();
  });

  test('updateWebhook rejects a header name that is not valid', async () => {
    const updateWebhook = vi.fn();
    setStrapi({ findWebhook: vi.fn(async () => webhook), updateWebhook });
    const ctx = createCtx({ params: { id: '4' }, body: { ...body, headers: { 'a b': 'c' } } });

    await expect(webhooksController.updateWebhook(ctx as any)).rejects.toThrow(
      'a b is not a valid header name'
    );
    expect(updateWebhook).not.toHaveBeenCalled();
  });
});

describe('Webhooks controller trigger', () => {
  test('triggerWebhook returns 404 for a webhook that does not exist', async () => {
    const runner = setStrapi({ findWebhook: vi.fn(async () => null) });
    const ctx = createCtx({ params: { id: '99999' } });

    await webhooksController.triggerWebhook(ctx as any);

    expect(ctx.notFound).toHaveBeenCalledWith('webhook.notFound');
    expect(runner.run).not.toHaveBeenCalled();
  });

  test('triggerWebhook runs a webhook that exists', async () => {
    const runner = setStrapi({ findWebhook: vi.fn(async () => webhook) });
    runner.run.mockResolvedValue({ statusCode: 200 });
    const ctx = createCtx({ params: { id: '4' } });

    await webhooksController.triggerWebhook(ctx as any);

    expect(runner.run).toHaveBeenCalledWith(webhook, 'trigger-test', {});
    expect(ctx.body).toEqual({ data: { statusCode: 200 } });
  });
});

describe('Webhooks controller content type events', () => {
  const ARTICLE_UID = 'api::article.article';
  const DELETED_UID = 'api::deleted.deleted';

  const setStrapiWithContentTypes = (
    store: Record<string, Mock>,
    contentTypes: Record<string, unknown> = { [ARTICLE_UID]: {} }
  ) => {
    const runner = setStrapi(store);
    (global.strapi as any).contentTypes = contentTypes;
    return runner;
  };

  beforeEach(() => {
    emitAuditMock.mockClear();
  });

  test('createWebhook accepts events for a content type that exists', async () => {
    const contentTypeEvents = { [ARTICLE_UID]: ['entry.publish'] };
    const created = { ...webhook, contentTypeEvents };
    const createWebhook = vi.fn(async () => created);
    const runner = setStrapiWithContentTypes({ createWebhook });
    const ctx = createCtx({ body: { ...body, contentTypeEvents } });

    await webhooksController.createWebhook(ctx as any);

    expect(createWebhook).toHaveBeenCalledWith({ ...body, contentTypeEvents });
    expect(runner.add).toHaveBeenCalledWith(created);
    expect(ctx.created).toHaveBeenCalledWith({ data: created });
  });

  test('createWebhook rejects events for a content type that does not exist', async () => {
    const createWebhook = vi.fn();
    setStrapiWithContentTypes({ createWebhook });
    const ctx = createCtx({
      body: { ...body, contentTypeEvents: { 'api::missing.missing': ['entry.create'] } },
    });

    await expect(webhooksController.createWebhook(ctx as any)).rejects.toThrow(
      new errors.ValidationError('Content type api::missing.missing does not exist')
    );
    expect(createWebhook).not.toHaveBeenCalled();
    expect(emitAuditMock).not.toHaveBeenCalled();
  });

  test('createWebhook rejects per content type events that are not a list of events', async () => {
    const createWebhook = vi.fn();
    setStrapiWithContentTypes({ createWebhook });
    const ctx = createCtx({
      body: { ...body, contentTypeEvents: { [ARTICLE_UID]: 'entry.create' } },
    });

    await expect(webhooksController.createWebhook(ctx as any)).rejects.toThrow(
      errors.ValidationError
    );
    expect(createWebhook).not.toHaveBeenCalled();
  });

  test('updateWebhook keeps the events of a content type deleted since the webhook was saved', async () => {
    const contentTypeEvents = { [DELETED_UID]: ['entry.create'] };
    const saved = { ...webhook, contentTypeEvents };
    const updateWebhook = vi.fn(async () => saved);
    setStrapiWithContentTypes(
      { findWebhook: vi.fn(async () => saved), updateWebhook },
      { [ARTICLE_UID]: {} }
    );
    const ctx = createCtx({ params: { id: '4' }, body: { ...body, contentTypeEvents } });

    await webhooksController.updateWebhook(ctx as any);

    expect(updateWebhook).toHaveBeenCalledWith('4', { ...saved, ...body, contentTypeEvents });
    expect(ctx.send).toHaveBeenCalledWith({ data: saved });
  });

  test('updateWebhook rejects a new content type that does not exist', async () => {
    const updateWebhook = vi.fn();
    setStrapiWithContentTypes({ findWebhook: vi.fn(async () => webhook), updateWebhook });
    const ctx = createCtx({
      params: { id: '4' },
      body: { ...body, contentTypeEvents: { 'api::missing.missing': ['entry.create'] } },
    });

    await expect(webhooksController.updateWebhook(ctx as any)).rejects.toThrow(
      new errors.ValidationError('Content type api::missing.missing does not exist')
    );
    expect(updateWebhook).not.toHaveBeenCalled();
  });
});
