import { request, hasPermissions } from '@strapi/helper-plugin';
import getContentTypeLinks from '../getContentTypeLinks';

// FIXME
jest.mock('@strapi/helper-plugin');

describe('checkPermissions', () => {
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
        action: 'plugin::i18n.locale.read',
        subject: null,
        properties: {},
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
    ];

    const data = [
      {
        uid: 'api::address.address',
        isDisplayed: true,
        apiID: 'address',
        kind: 'collectionType',
        info: {
          label: 'address',
        },
      },
      {
        uid: 'api::article.article',
        isDisplayed: true,
        apiID: 'article',
        kind: 'collectionType',
        info: {
          label: 'article',
        },
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
      },
    ];

    request.mockImplementation(url => {
      if (url === '/content-manager/content-types') {
        return Promise.resolve({ data });
      }

      return Promise.resolve({
        data: [
          {
            uid: 'api::address.address',
            settings: {
              pageSize: 10,
              defaultSortBy: 'name',
              defaultSortOrder: 'ASC',
            },
          },
        ],
      });
    });

    const expected = {
      authorizedCtLinks: [
        {
          destination: '/content-manager/collectionType/api::address.address',
          icon: 'circle',
          isDisplayed: true,
          label: 'address',
          permissions: [
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::address.address',
            },
            {
              action: 'plugin::content-manager.explorer.read',
              subject: 'api::address.address',
            },
          ],
          search: 'page=1&pageSize=10&sort=name:ASC',
        },
        {
          destination: '/content-manager/collectionType/api::article.article',
          icon: 'circle',
          isDisplayed: true,
          label: 'article',
          search: null,
          permissions: [
            {
              action: 'plugin::content-manager.explorer.create',
              subject: 'api::article.article',
            },
            {
              action: 'plugin::content-manager.explorer.read',
              subject: 'api::article.article',
            },
          ],
        },
      ],
      authorizedStLinks: [],
      contentTypes: data,
    };
    const actual = await getContentTypeLinks(userPermissions);

    expect(actual).toEqual(expected);
  });

  it('creates an array of boolean corresponding to the permission state', async () => {
    console.error = () => undefined;
    const toggleNotification = jest.fn();
    const userPermissions = [];

    request.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await getContentTypeLinks(userPermissions, toggleNotification);
    expect(toggleNotification).toBeCalled();
  });
});
