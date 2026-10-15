import { emitAudit } from '@strapi/utils';
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
