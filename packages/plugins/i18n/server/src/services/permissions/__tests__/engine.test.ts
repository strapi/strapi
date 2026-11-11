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
      admin: {
        services: {
          role: {
            hasSuperAdminRole: (user: { roles?: Array<{ code: string }> }) =>
              (user?.roles ?? []).some((role) => role.code === 'strapi-super-admin'),
          },
        },
      },
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

  test('skips super admins without reading the permission', () => {
    const { context, and, permissionGetter } = createContext(
      { id: 1, roles: [{ code: 'strapi-super-admin' }] },
      { locales: ['en'] }
    );

    engine.willRegisterPermission(context);

    expect(and).not.toHaveBeenCalled();
    expect(permissionGetter).not.toHaveBeenCalled();
  });

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
