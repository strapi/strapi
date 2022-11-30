import getCustomFieldUidsFromLayout from '../getCustomFieldUidsFromLayout';

describe('CONTENT MANAGER | CONTAINERS | EditView | utils | getCustomFieldUidsFromLayout', () => {
  it('gets a unique list of custom field uids on the content-type layout', () => {
    const mockLayoutData = {
      contentType: {
        layouts: {
          edit: [
            [
              {
                name: 'short_text',
                size: 6,
                fieldSchema: {
                  type: 'string',
                },
              },
            ],
            [
              {
                name: 'dynamiczone',
                size: 12,
                fieldSchema: {
                  type: 'dynamiczone',
                  components: ['basic.simple'],
                },
              },
            ],
            [
              {
                name: 'custom_field_2',
                size: 6,
                fieldSchema: {
                  type: 'string',
                  customField: 'plugin::color-picker.color',
                },
              },
            ],
            [
              {
                name: 'custom_field_2',
                size: 6,
                fieldSchema: {
                  type: 'string',
                  customField: 'plugin::color-picker.color',
                },
              },
            ],
          ],
        },
      },
      components: {
        'basic.simple': {
          uid: 'basic.simple',
          layouts: {
            edit: [
              [
                {
                  name: 'name',
                  size: 6,
                  fieldSchema: {
                    type: 'string',
                    required: true,
                  },
                },
              ],
              [
                {
                  name: 'custom_field_3',
                  size: 6,
                  fieldSchema: {
                    type: 'string',
                    customField: 'plugin::test-plugin.test',
                  },
                },
              ],
            ],
          },
        },
      },
    };

    const expected = ['plugin::color-picker.color', 'plugin::test-plugin.test'];

    expect(getCustomFieldUidsFromLayout(mockLayoutData)).toEqual(expected);
  });
});
