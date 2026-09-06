import sectionsBuilder from '../sections-builder';

const mockGetService = jest.fn();

jest.mock('../../../utils', () => ({
  getService: (...args: unknown[]) => mockGetService(...args),
}));

describe('localesPropertyHandler', () => {
  const appliesToProperty = jest.fn();
  const locales = [
    { name: 'English', code: 'en' },
    { name: 'French', code: 'fr' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    global.strapi = {
      admin: {
        services: {
          permission: { actionProvider: { appliesToProperty } },
        },
      },
    } as any;

    mockGetService.mockReturnValue({
      find: jest.fn(() => Promise.resolve(locales)),
      setIsDefault: jest.fn((ls: any[]) =>
        Promise.resolve(ls.map((l) => ({ ...l, isDefault: l.code === 'en' })))
      ),
    });

    appliesToProperty.mockResolvedValue(true);
  });

  it('adds locale children with isDefault to subjects in the permissions layout', async () => {
    const subject = { uid: 'api::article.article', properties: [] as any[] };
    await sectionsBuilder.localesPropertyHandler({
      action: { actionId: 'plugin::content-manager.explorer.read' },
      section: { subjects: [subject] },
    });

    expect(subject.properties).toHaveLength(1);
    expect(subject.properties[0].children).toEqual([
      { label: 'English', value: 'en', isDefault: true },
      { label: 'French', value: 'fr', isDefault: false },
    ]);
  });

  it('uses the locale code as label when name is absent', async () => {
    mockGetService.mockReturnValue({
      find: jest.fn(() => Promise.resolve([{ name: '', code: 'de' }])),
      setIsDefault: jest.fn((ls: any[]) =>
        Promise.resolve(ls.map((l) => ({ ...l, isDefault: false })))
      ),
    });

    const subject = { uid: 'api::article.article', properties: [] as any[] };
    await sectionsBuilder.localesPropertyHandler({
      action: { actionId: 'plugin::content-manager.explorer.read' },
      section: { subjects: [subject] },
    });

    expect(subject.properties[0].children[0].label).toBe('de');
  });

  it('does not add a locales property when no locales are registered', async () => {
    mockGetService.mockReturnValue({
      find: jest.fn(() => Promise.resolve([])),
      setIsDefault: jest.fn(() => Promise.resolve([])),
    });

    const subject = { uid: 'api::article.article', properties: [] as any[] };
    await sectionsBuilder.localesPropertyHandler({
      action: { actionId: 'plugin::content-manager.explorer.read' },
      section: { subjects: [subject] },
    });

    expect(subject.properties).toHaveLength(0);
  });

  it('skips subjects where the action does not apply to locales', async () => {
    appliesToProperty.mockResolvedValue(false);

    const subject = { uid: 'api::article.article', properties: [] as any[] };
    await sectionsBuilder.localesPropertyHandler({
      action: { actionId: 'plugin::content-manager.explorer.delete' },
      section: { subjects: [subject] },
    });

    expect(subject.properties).toHaveLength(0);
  });

  it('skips subjects that already have a locales property', async () => {
    const existing = { value: 'locales', label: 'Locales', children: [] };
    const subject = { uid: 'api::article.article', properties: [existing] as any[] };
    await sectionsBuilder.localesPropertyHandler({
      action: { actionId: 'plugin::content-manager.explorer.read' },
      section: { subjects: [subject] },
    });

    expect(subject.properties).toHaveLength(1);
  });
});
