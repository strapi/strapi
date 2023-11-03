'use strict';

const createContext = require('../../../../../../test/helpers/create-context');
const contentTypes = require('../content-types');

describe('Content Types', () => {
  test('findContentTypesSettings', async () => {
    const contentTypeUid = 'test-content-type';
    const fakeConfig = {
      metadatas: {},
      layouts: {},
      settings: {
        bulkable: true,
        filterable: true,
        searchable: true,
        pageSize: 10,
        mainField: 'username',
        defaultSortBy: 'username',
        defaultSortOrder: 'ASC',
      },
    };

    global.strapi = {
      plugins: {
        'content-manager': {
          services: {
            'content-types': {
              findAllContentTypes() {
                return [{ uid: contentTypeUid }];
              },
              findConfiguration() {
                return {
                  uid: contentTypeUid,
                  ...fakeConfig,
                };
              },
            },
          },
        },
      },
    };

    const ctx = createContext({});

    await contentTypes.findContentTypesSettings(ctx);

    expect(ctx.body).toStrictEqual({
      data: [
        {
          uid: contentTypeUid,
          settings: fakeConfig.settings,
        },
      ],
    });
  });
});
