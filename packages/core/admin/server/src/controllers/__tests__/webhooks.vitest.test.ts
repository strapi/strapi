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
  const runner = {
    add: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    run: vi.fn(),
    checkDestination: vi.fn(async (): Promise<unknown> => undefined),
  };
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

describe('Webhooks controller destination checks', () => {
  const blocked = {
    hostname: 'internal.example.com',
    address: '10.0.0.5',
    option: 'blockPrivateNetworks',
    message:
      'internal.example.com resolves to 10.0.0.5, which server.webhooks.destinationChecks.blockPrivateNetworks blocks. Set it to false to allow it.',
  };

  beforeEach(() => {
    emitAuditMock.mockClear();
  });

  // https://github.com/strapi/strapi/issues/26876
  test.each(['http://localhost:1337/hook', 'http://10.0.0.5/hook'])(
    'createWebhook saves %s in production when no check is on',
    async (url) => {
      vi.stubEnv('NODE_ENV', 'production');

      try {
        const created = { ...webhook, url };
        setStrapi({ createWebhook: vi.fn(async () => created) });
        const ctx = createCtx({ body: { ...body, url } });

        await webhooksController.createWebhook(ctx as any);

        expect(ctx.created).toHaveBeenCalledWith({ data: created });
      } finally {
        vi.unstubAllEnvs();
      }
    }
  );

  test('createWebhook saves a URL the checks allow', async () => {
    const createWebhook = vi.fn(async () => webhook);
    const runner = setStrapi({ createWebhook });
    const ctx = createCtx({ body });

    await webhooksController.createWebhook(ctx as any);

    expect(runner.checkDestination).toHaveBeenCalledWith(webhook.url);
    expect(ctx.created).toHaveBeenCalledWith({ data: webhook });
  });

  test('createWebhook rejects a URL a check blocks, with the reason', async () => {
    const createWebhook = vi.fn();
    const runner = setStrapi({ createWebhook });
    runner.checkDestination.mockResolvedValue(blocked);
    const ctx = createCtx({ body: { ...body, url: 'https://internal.example.com/hook' } });

    const error = await webhooksController.createWebhook(ctx as any).catch((e) => e);

    expect(error).toBeInstanceOf(errors.ApplicationError);
    expect(error.message).toBe(blocked.message);
    expect(createWebhook).not.toHaveBeenCalled();
    expect(emitAuditMock).not.toHaveBeenCalled();
  });

  test('updateWebhook rejects a new URL a check blocks', async () => {
    const updateWebhook = vi.fn();
    const runner = setStrapi({ findWebhook: vi.fn(async () => webhook), updateWebhook });
    runner.checkDestination.mockResolvedValue(blocked);
    const ctx = createCtx({
      params: { id: '4' },
      body: { ...body, url: 'https://internal.example.com/hook' },
    });

    await expect(webhooksController.updateWebhook(ctx as any)).rejects.toMatchObject({
      name: 'ApplicationError',
      message: blocked.message,
    });
    expect(runner.checkDestination).toHaveBeenCalledWith('https://internal.example.com/hook');
    expect(updateWebhook).not.toHaveBeenCalled();
  });

  test('updateWebhook does not check a URL that did not change, so the webhook can still be disabled', async () => {
    const disabled = { ...webhook, isEnabled: false };
    const updateWebhook = vi.fn(async () => disabled);
    const runner = setStrapi({ findWebhook: vi.fn(async () => webhook), updateWebhook });
    runner.checkDestination.mockResolvedValue(blocked);
    const ctx = createCtx({ params: { id: '4' }, body: { ...body, isEnabled: false } });

    await webhooksController.updateWebhook(ctx as any);

    expect(runner.checkDestination).not.toHaveBeenCalled();
    expect(ctx.send).toHaveBeenCalledWith({ data: disabled });
  });
});
