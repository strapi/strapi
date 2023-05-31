import { getFetchClient, hasPermissions } from '@strapi/helper-plugin';
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

    const contentTypes = [
      {
        apiID: 'address',
        info: {
          displayName: 'Address',
        },
        isDisplayed: true,
        kind: 'collectionType',
        uid: 'api::address.address',
      },
      {
        apiID: 'article',
        info: {
          displayName: 'Article',
        },
        isDisplayed: true,
        kind: 'collectionType',
        uid: 'api::article.article',
        pluginOptions: {
          i18n: {
            localized: true,
          },
        },
      },
    ];

    getFetchClient.mockImplementation(() => ({
      get(url) {
        if (url === '/content-manager/content-types-settings') {
          return Promise.resolve({
            data: {
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
            },
          });
        }

        // To please the linter
        return Promise.resolve(null);
      },
    }));

    const expected = {
      authorizedCollectionTypeLinks: [
        {
          isDisplayed: true,
          kind: 'collectionType',
          name: 'api::address.address',
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
          title: 'Address',
          to: '/content-manager/collectionType/api::address.address',
          uid: 'api::address.address',
        },
        {
          isDisplayed: true,
          kind: 'collectionType',
          name: 'api::article.article',
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
          search: null,
          title: 'Article',
          to: '/content-manager/collectionType/api::article.article',
          uid: 'api::article.article',
        },
      ],
      authorizedSingleTypeLinks: [],
    };
    const actual = await getContentTypeLinks({ userPermissions, models: contentTypes });

    expect(actual).toEqual(expected);
  });

  it('creates an array of boolean corresponding to the permission state', async () => {
    console.error = () => undefined;
    const toggleNotification = jest.fn();
    const userPermissions = [];

    getFetchClient.mockImplementation(() => ({
      get() {
        throw new Error('Something went wrong');
      },
    }));

    await getContentTypeLinks({ userPermissions, toggleNotification });
    expect(toggleNotification).toBeCalled();
  });
});
