import { convertCustomFieldType } from '../convert-custom-field-type';

describe('format attributes', () => {
  it('replaces type customField with the underlying data type', () => {
    global.strapi = {
      // mock container.get('custom-fields')
      get: jest.fn(() => ({
        // mock container.get('custom-fields').get(uid)
        get: jest.fn(() => ({
          name: 'color',
          plugin: 'mycustomfields',
          type: 'text',
        })),
      })),

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
      components: {
        'default.test': {
          attributes: {
            color: {
              type: 'customField',
              customField: 'plugin::mycustomfields.color',
            },
          },
        },
      },
    } as any;

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
      components: {
        'default.test': {
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
