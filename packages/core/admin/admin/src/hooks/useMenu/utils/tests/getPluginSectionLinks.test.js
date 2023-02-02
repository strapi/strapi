import getPluginSectionLinks from '../getPluginSectionLinks';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  hasPermissions: jest.fn().mockResolvedValue(true),
}));

describe('getPluginSectionLinks', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates an array of boolean corresponding to the permission state', async () => {
    const userPermissions = [
      {
        id: 458,
        action: 'plugin::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugin::content-manager.explorer.create',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugin::content-manager.explorer.read',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugin::content-manager.explorer.update',
        subject: 'api::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
    ];

    const pluginsSectionRawLinks = [
      {
        destination: '/plugins/content-type-builder',
        icon: 'paint-brush',
        label: {
          id: 'content-type-builder.plugin.name',
          defaultMessage: 'Content-Types Builder',
        },
        permissions: [
          {
            action: 'plugin::content-type-builder.read',
            subject: null,
          },
        ],
        isDisplayed: false,
      },
      {
        destination: '/plugins/upload',
        icon: 'cloud-upload-alt',
        label: {
          id: 'upload.plugin.name',
          defaultMessage: 'Media Library',
        },
        permissions: [
          {
            action: 'plugin::upload.read',
            subject: null,
          },
          {
            action: 'plugin::upload.assets.create',
            subject: null,
          },
          {
            action: 'plugin::upload.assets.update',
            subject: null,
          },
        ],
        isDisplayed: false,
      },
    ];

    const expected = [
      {
        destination: '/plugins/content-type-builder',
        icon: 'paint-brush',
        isDisplayed: false,
        label: { defaultMessage: 'Content-Types Builder', id: 'content-type-builder.plugin.name' },
        permissions: [{ action: 'plugin::content-type-builder.read', subject: null }],
      },
      {
        destination: '/plugins/upload',
        icon: 'cloud-upload-alt',
        isDisplayed: false,
        label: { defaultMessage: 'Media Library', id: 'upload.plugin.name' },
        permissions: [
          { action: 'plugin::upload.read', subject: null },
          { action: 'plugin::upload.assets.create', subject: null },
          { action: 'plugin::upload.assets.update', subject: null },
        ],
      },
    ];
    const actual = await getPluginSectionLinks(userPermissions, pluginsSectionRawLinks);

    expect(actual).toEqual(expected);
  });
});
