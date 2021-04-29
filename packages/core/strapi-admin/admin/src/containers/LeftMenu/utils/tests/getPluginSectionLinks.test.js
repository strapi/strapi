import { hasPermissions } from 'strapi-helper-plugin';
import getPluginSectionLinks from '../getPluginSectionLinks';

jest.mock('strapi-helper-plugin');

describe('getPluginSectionLinks', () => {
  beforeEach(() => {
    hasPermissions.mockImplementation(() => Promise.resolve(true));
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('creates an array of boolean corresponding to the permission state', async () => {
    const userPermissions = [
      {
        id: 458,
        action: 'plugins::i18n.locale.read',
        subject: null,
        properties: {},
        conditions: [],
      },
      {
        id: 459,
        action: 'plugins::content-manager.explorer.create',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 460,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['en'],
        },
        conditions: [],
      },
      {
        id: 461,
        action: 'plugins::content-manager.explorer.read',
        subject: 'application::article.article',
        properties: {
          fields: ['Name'],
          locales: ['fr-FR'],
        },
        conditions: [],
      },
      {
        id: 462,
        action: 'plugins::content-manager.explorer.update',
        subject: 'application::article.article',
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
            action: 'plugins::content-type-builder.read',
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
            action: 'plugins::upload.read',
            subject: null,
          },
          {
            action: 'plugins::upload.assets.create',
            subject: null,
          },
          {
            action: 'plugins::upload.assets.update',
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
        permissions: [{ action: 'plugins::content-type-builder.read', subject: null }],
      },
      {
        destination: '/plugins/upload',
        icon: 'cloud-upload-alt',
        isDisplayed: false,
        label: { defaultMessage: 'Media Library', id: 'upload.plugin.name' },
        permissions: [
          { action: 'plugins::upload.read', subject: null },
          { action: 'plugins::upload.assets.create', subject: null },
          { action: 'plugins::upload.assets.update', subject: null },
        ],
      },
    ];
    const actual = await getPluginSectionLinks(userPermissions, pluginsSectionRawLinks);

    expect(actual).toEqual(expected);
  });
});
