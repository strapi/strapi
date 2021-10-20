import { request, hasPermissions } from 'strapi-helper-plugin';
import getCtOrStLinks from '../getCtOrStLinks';

jest.mock('strapi-helper-plugin');

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
        action: 'plugins::i18n.locale.read',
        subject: null,
        properties: {},
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
    ];

    const data = [
      {
        uid: 'application::address.address',
        isDisplayed: true,
        apiID: 'address',
        kind: 'collectionType',
        info: {
          label: 'address',
        },
      },
      {
        uid: 'application::article.article',
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
            uid: 'application::address.address',
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
          destination: '/plugins/content-manager/collectionType/application::address.address',
          icon: 'circle',
          isDisplayed: true,
          label: 'address',
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::address.address',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::address.address',
            },
          ],
          search: 'page=1&pageSize=10&_sort=name:ASC',
        },
        {
          destination: '/plugins/content-manager/collectionType/application::article.article',
          icon: 'circle',
          isDisplayed: true,
          label: 'article',
          search: null,
          permissions: [
            {
              action: 'plugins::content-manager.explorer.create',
              subject: 'application::article.article',
            },
            {
              action: 'plugins::content-manager.explorer.read',
              subject: 'application::article.article',
            },
          ],
        },
      ],
      authorizedStLinks: [],
      contentTypes: data,
    };
    const actual = await getCtOrStLinks(userPermissions);

    expect(actual).toEqual(expected);
  });

  it('creates an array of boolean corresponding to the permission state', async () => {
    console.error = () => undefined;
    strapi.notification.toggle = jest.fn();
    const userPermissions = [];

    request.mockImplementation(() => {
      throw new Error('Something went wrong');
    });

    await getCtOrStLinks(userPermissions);
    expect(strapi.notification.toggle).toBeCalled();
  });
});
