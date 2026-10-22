import { emitAudit, errors } from '@strapi/utils';
// @ts-expect-error - types are not generated for this file
// eslint-disable-next-line import/no-relative-packages
import createContext from '../../../../../../../tests/helpers/create-context';
import webhooksController from '../webhooks';

jest.mock('@strapi/utils', () => ({
  ...jest.requireActual('@strapi/utils'),
  emitAudit: jest.fn(() => Promise.resolve()),
}));

const emitAuditMock = emitAudit as jest.Mock;

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

const setStrapi = (store: Record<string, jest.Mock>) => {
  const runner = { add: jest.fn(), update: jest.fn(), remove: jest.fn(), run: jest.fn() };
  global.strapi = {
    get: (name: string) => (name === 'webhookStore' ? store : runner),
  } as any;
  return runner;
};

const createCtx = (input: Record<string, unknown>) => ({
  ...createContext(input),
  created: jest.fn(),
  send: jest.fn(),
  notFound: jest.fn(),
  badRequest: jest.fn(),
});

describe('Webhooks controller audit events', () => {
  beforeEach(() => {
    emitAuditMock.mockClear();
  });

  test('createWebhook emits webhook.create with header names only', async () => {
    setStrapi({ createWebhook: jest.fn(async () => webhook) });
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
      findWebhook: jest.fn(async () => webhook),
      updateWebhook: jest.fn(async () => updated),
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
      findWebhook: jest.fn(async () => webhook),
      updateWebhook: jest.fn(async () => ({
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
      findWebhook: jest.fn(async () => webhook),
      deleteWebhook: jest.fn(async () => webhook),
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
      findWebhook: jest.fn(async (id: string) => byId[id] ?? null),
      deleteWebhook: jest.fn(async (id: string) => byId[id]),
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

describe('Webhooks controller content type events', () => {
  const ARTICLE_UID = 'api::article.article';
  const DELETED_UID = 'api::deleted.deleted';

  const setStrapiWithContentTypes = (
    store: Record<string, jest.Mock>,
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
    const createWebhook = jest.fn(async () => created);
    const runner = setStrapiWithContentTypes({ createWebhook });
    const ctx = createCtx({ body: { ...body, contentTypeEvents } });

    await webhooksController.createWebhook(ctx as any);

    expect(createWebhook).toHaveBeenCalledWith({ ...body, contentTypeEvents });
    expect(runner.add).toHaveBeenCalledWith(created);
    expect(ctx.created).toHaveBeenCalledWith({ data: created });
  });

  test('createWebhook rejects events for a content type that does not exist', async () => {
    const createWebhook = jest.fn();
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
    const createWebhook = jest.fn();
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
    const updateWebhook = jest.fn(async () => saved);
    setStrapiWithContentTypes(
      { findWebhook: jest.fn(async () => saved), updateWebhook },
      { [ARTICLE_UID]: {} }
    );
    const ctx = createCtx({ params: { id: '4' }, body: { ...body, contentTypeEvents } });

    await webhooksController.updateWebhook(ctx as any);

    expect(updateWebhook).toHaveBeenCalledWith('4', { ...saved, ...body, contentTypeEvents });
    expect(ctx.send).toHaveBeenCalledWith({ data: saved });
  });

  test('updateWebhook rejects a new content type that does not exist', async () => {
    const updateWebhook = jest.fn();
    setStrapiWithContentTypes({ findWebhook: jest.fn(async () => webhook), updateWebhook });
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
