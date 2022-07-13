'use strict';

const { formatAttribute } = require('../attributes');

describe('format attributes', () => {
  it('replaces type customField with the underlying data type', () => {
    const mockAttribute = {
      type: 'customField',
      customField: 'plugin::mycustomfields.color',
    };

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
    };

    const formattedAttribute = formatAttribute('key', mockAttribute);

    const expected = {
      type: 'text',
      customField: 'plugin::mycustomfields.color',
    };
    expect(formattedAttribute).toEqual(expected);
  });
});
