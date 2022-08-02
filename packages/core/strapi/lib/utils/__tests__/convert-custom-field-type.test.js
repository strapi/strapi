'use strict';

const convertCustomFieldType = require('../convert-custom-field-type');

describe('format attributes', () => {
  it('replaces type customField with the underlying data type', () => {
    global.strapi = {
      container: {
        // mock container.get('custom-fields')
        get: jest.fn(() => ({
          // mock container.get('custom-fields').get(uid)
          get: jest.fn(() => ({
            name: 'color',
            plugin: 'mycustomfields',
            type: 'text',
          })),
        })),
      },
      contentTypes: {
        test: {
          attributes: {
            color: {
              type: 'customField',
              customField: 'plugin::mycustomfields.color',
            },
          },
        },
      },
    };

    convertCustomFieldType(global.strapi);

    const expected = {
      ...global.strapi,
      contentTypes: {
        test: {
          attributes: {
            color: {
              type: 'text',
              customField: 'plugin::mycustomfields.color',
            },
          },
        },
      },
    };

    expect(global.strapi).toEqual(expected);
  });
});
