import engine from '../engine';

const mockGetService = jest.fn();

jest.mock('../../../utils', () => ({
  getService: (...args: unknown[]) => mockGetService(...args),
}));

const localizedModel = {
  uid: 'api::article.article',
  pluginOptions: { i18n: { localized: true } },
};

const createContext = (user: Record<string, unknown>, properties: Record<string, unknown>) => {
  const and = jest.fn();
  const permissionGetter = jest.fn(() => ({ subject: localizedModel.uid, properties }));

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
  const contentTypes = jest.fn(() => ({ [localizedModel.uid]: localizedModel }));
  const contentType = jest.fn((uid: string) =>
    uid === localizedModel.uid ? localizedModel : undefined
  );

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetService.mockImplementation(() => ({
      isLocalizedContentType: (model: typeof localizedModel | undefined) =>
        model?.pluginOptions?.i18n?.localized === true,
    }));

    global.strapi = {
      contentType,
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
});
