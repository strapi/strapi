import engine from '../engine';

const mockGetService = jest.fn();

jest.mock('../../../utils', () => ({
  getService: (...args: unknown[]) => mockGetService(...args),
}));

const localizedModel = {
  uid: 'api::article.article',
  pluginOptions: { i18n: { localized: true } },
};

const notLocalizedModel = {
  uid: 'api::category.category',
  pluginOptions: {},
};

const createContext = (
  user: Record<string, unknown>,
  properties: Record<string, unknown>,
  subject: unknown = localizedModel.uid
) => {
  const and = jest.fn();
  const permissionGetter = jest.fn(() => ({ subject, properties }));

  const context = {
    ...user,
    get permission() {
      return permissionGetter();
    },
    condition: { and },
  };

  return { context, and, permissionGetter };
};

describe('i18n permissions engine', () => {
  // Same shape as the core content-types registry: a plain object indexed by the given key
  const registry: Record<string, unknown> = {
    [localizedModel.uid]: localizedModel,
    [notLocalizedModel.uid]: notLocalizedModel,
  };
  const contentTypes = jest.fn(() => ({ ...registry }));
  const contentType = jest.fn((uid: string) => registry[uid]);

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetService.mockImplementation(() => ({
      isLocalizedContentType: (model: typeof localizedModel | undefined) =>
        model?.pluginOptions?.i18n?.localized === true,
    }));

    global.strapi = {
      contentType,
      get: (name: string) => (name === 'content-types' ? { get: contentType } : undefined),
      get contentTypes() {
        return contentTypes();
      },
    } as any;
  });

  test('adds the locale condition for a user restricted to some locales', () => {
    const { context, and } = createContext(
      { id: 1, roles: [{ code: 'strapi-editor' }] },
      { locales: ['en'] }
    );

    engine.willRegisterPermission(context);

    expect(and).toHaveBeenCalledWith({ locale: { $in: ['en'] } });
  });

  test.each([
    ['restricted to some locales', { locales: ['en'] }, ['en']],
    ['without a locales key', {}, []],
  ])(
    'keeps the locale condition for a token owned by a super admin, %s',
    (_, properties, expected) => {
      const owner = { id: 1, roles: [{ code: 'strapi-super-admin' }] };
      const { context, and } = createContext(owner, properties);

      engine.willRegisterPermission(context);

      expect(and).toHaveBeenCalledWith({ locale: { $in: expected } });
    }
  );

  test('looks up the subject without copying the content-type registry', () => {
    const { context } = createContext(
      { id: 1, roles: [{ code: 'strapi-editor' }] },
      { locales: ['en'] }
    );

    engine.willRegisterPermission(context);

    expect(contentType).toHaveBeenCalledWith(localizedModel.uid);
    expect(contentTypes).not.toHaveBeenCalled();
  });

  describe('subjects that are not a localized content type', () => {
    const editor = { id: 1, roles: [{ code: 'strapi-editor' }] };

    test.each([
      ['a null subject', null],
      ['a record subject', { uid: localizedModel.uid }],
      ['a string subject that is not a content-type UID', 'plugin::foo.bar'],
      ['a non-localized content-type UID', notLocalizedModel.uid],
    ])('adds no locale condition for %s', (_, subject) => {
      const { context, and } = createContext(editor, { locales: ['en'] }, subject);

      expect(() => engine.willRegisterPermission(context)).not.toThrow();
      expect(and).not.toHaveBeenCalled();
    });
  });

  test('adds no locale condition when the locales property is null (access to all locales)', () => {
    const { context, and } = createContext(
      { id: 1, roles: [{ code: 'strapi-editor' }] },
      { locales: null }
    );

    engine.willRegisterPermission(context);

    expect(and).not.toHaveBeenCalled();
  });
});
