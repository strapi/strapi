import bootstrap from '../bootstrap';
import { getService } from '../utils';

jest.mock('../audit-logs', () => ({
  registerAuditEvents: jest.fn(),
}));

jest.mock('../utils', () => ({
  getService: jest.fn(),
}));

const getServiceMock = getService as jest.Mock;

const syncNonLocalizedAttributes = jest.fn();
const findOne = jest.fn();

const services: Record<string, unknown> = {
  metrics: { sendDidInitializeEvent: jest.fn() },
  locales: {
    initDefaultLocale: jest.fn(),
    getDefaultLocale: jest.fn(async () => 'en'),
  },
  permissions: {
    sectionsBuilder: { registerLocalesPropertyHandler: jest.fn() },
    actions: {
      registerI18nActions: jest.fn(),
      registerI18nActionsHooks: jest.fn(),
      updateActionsProperties: jest.fn(),
    },
    engine: { registerI18nPermissionsHandlers: jest.fn() },
  },
  'content-types': {
    isLocalizedContentType: () => true,
    getNestedPopulateOfNonLocalizedAttributes: () => ['shared'],
    copyNonLocalizedAttributes: (_schema: unknown, data: unknown) => data ?? {},
  },
  localizations: { syncNonLocalizedAttributes },
  'ai-translations': {
    hasProvider: () => true,
    registerStrapiManagedProvider: jest.fn(),
  },
  'ai-localizations': { setupMiddleware: jest.fn() },
};

const schema = {
  uid: 'api::article.article',
  options: { draftAndPublish: true },
  attributes: {},
};

describe('i18n bootstrap document middleware', () => {
  let middleware: (context: any, next: () => Promise<unknown>) => Promise<unknown>;

  beforeEach(async () => {
    jest.clearAllMocks();
    getServiceMock.mockImplementation((name: string) => services[name]);
    findOne.mockResolvedValue({ id: 9, shared: 'value' });

    global.strapi = {
      db: {
        lifecycles: { subscribe: jest.fn() },
        query: jest.fn(() => ({ findOne })),
      },
      documents: {
        use(fn: typeof middleware) {
          middleware = fn;
        },
      },
      has: () => false,
      ai: { admin: { isAvailable: () => false } },
    } as any;

    await bootstrap();
  });

  it('loads the original row for the locale and status being written', async () => {
    const next = jest.fn(async () => ({ id: 9 }));
    findOne
      .mockResolvedValueOnce({ id: 9, shared: 'old' })
      .mockResolvedValueOnce({ id: 9, shared: 'new' });

    await middleware(
      {
        action: 'update',
        contentType: schema,
        params: { locale: 'fr', documentId: 'doc-1' },
      },
      next
    );

    expect(findOne).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        locale: 'fr',
        publishedAt: { $null: true },
      },
      populate: ['shared'],
    });
    expect(syncNonLocalizedAttributes).toHaveBeenCalled();
  });

  it('compares against the published sibling when the action is publish', async () => {
    const next = jest.fn(async () => ({ id: 9 }));

    await middleware(
      {
        action: 'publish',
        contentType: schema,
        params: { documentId: 'doc-1' },
      },
      next
    );

    expect(findOne).toHaveBeenCalledWith({
      where: {
        documentId: 'doc-1',
        locale: 'en',
        publishedAt: { $ne: null },
      },
      populate: ['shared'],
    });
  });

  it('compares a sibling when the locale being written does not exist yet', async () => {
    const next = jest.fn(async () => ({ id: 9 }));
    findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ shared: 'same' })
      .mockResolvedValueOnce({ shared: 'same' });

    await middleware(
      {
        action: 'update',
        contentType: schema,
        params: { locale: 'fr', documentId: 'doc-1' },
      },
      next
    );

    expect(findOne).toHaveBeenNthCalledWith(1, {
      where: {
        documentId: 'doc-1',
        locale: 'fr',
        publishedAt: { $null: true },
      },
      populate: ['shared'],
    });
    expect(findOne).toHaveBeenNthCalledWith(2, {
      where: {
        documentId: 'doc-1',
        locale: { $ne: 'fr' },
        publishedAt: { $null: true },
      },
      populate: ['shared'],
    });
    expect(syncNonLocalizedAttributes).not.toHaveBeenCalled();
  });

  it('compares a published sibling when a first publish has no published row', async () => {
    const next = jest.fn(async () => ({ id: 9 }));
    findOne.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 2, shared: 'live' });

    await middleware(
      {
        action: 'publish',
        contentType: schema,
        params: { locale: 'fr', documentId: 'doc-1' },
      },
      next
    );

    expect(findOne).toHaveBeenNthCalledWith(2, {
      where: {
        documentId: 'doc-1',
        locale: { $ne: 'fr' },
        publishedAt: { $ne: null },
      },
      populate: ['shared'],
    });
  });

  it('skips the original lookup when the document id is missing', async () => {
    const next = jest.fn(async () => ({ id: 9 }));
    findOne.mockClear();

    await middleware(
      {
        action: 'create',
        contentType: schema,
        params: { locale: 'fr', documentId: 12 },
      },
      next
    );

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({
      where: { id: 9 },
      populate: ['shared'],
    });
  });
});
