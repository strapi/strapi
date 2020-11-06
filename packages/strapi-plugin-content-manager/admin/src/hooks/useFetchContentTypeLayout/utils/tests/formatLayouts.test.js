import formatLayouts, { formatLayoutWithMetas } from '../formatLayouts';

describe('Content Manager | hooks | useFetchContentTypeLayout | utils | formatLayoutWithMetas', () => {
  describe('formatLayouts', () => {
    it('should format the content type and components layouts', () => {
      const models = [
        {
          uid: 'compo',

          attributes: {
            full_name: {
              type: 'string',
              required: true,
            },

            city: {
              type: 'string',
              maxLength: 100,
            },

            compo: {
              type: 'component',
              repeatable: true,
            },
          },

          settings: { test: 'test' },
          options: { timestamps: false },
        },
        {
          attributes: {
            full_name: {
              type: 'string',
              required: true,
            },

            city: {
              type: 'string',
              maxLength: 100,
            },
            dz: {
              type: 'dynamiczone',
            },
            compo: {
              type: 'component',
              repeatable: true,
            },
          },
          uid: 'contentType',
        },
      ];
      const data = {
        components: {
          compo: {
            uid: 'compo',

            layouts: {
              edit: [
                [
                  { name: 'full_name', size: 6 },
                  { name: 'city', size: 6 },
                ],
                [{ name: 'compo', size: 12 }],
              ],
            },
            metadatas: {
              full_name: {
                edit: {
                  description: 'test',
                  editable: true,
                  label: 'Full_name',
                  placeholder: '',
                  visible: true,
                },
              },
              city: {
                edit: {
                  description: '',
                  editable: false,
                  label: 'City',
                  placeholder: '',
                  visible: true,
                },
              },
              compo: {
                edit: {
                  description: '',
                  editable: true,
                  label: 'compo',
                  placeholder: '',
                  visible: true,
                },
              },
            },
          },
        },
        contentType: {
          uid: 'contentType',
          layouts: {
            list: [],
            editRelations: [],
            edit: [
              [{ name: 'dz', size: 12 }],
              [
                { name: 'full_name', size: 6 },
                { name: 'city', size: 6 },
              ],
              [{ name: 'compo', size: 12 }],
            ],
          },
          metadatas: {
            full_name: {
              edit: {
                description: 'test',
                editable: true,
                label: 'Full_name',
                placeholder: '',
                visible: true,
              },
            },
            city: {
              edit: {
                description: '',
                editable: false,
                label: 'City',
                placeholder: '',
                visible: true,
              },
            },
            dz: {
              edit: {
                description: '',
                editable: true,
                label: 'Dz',
                placeholder: '',
                visible: true,
              },
            },
            compo: {
              edit: {
                description: '',
                editable: true,
                label: 'compo',
                placeholder: '',
                visible: true,
              },
            },
          },
        },
      };

      const result = formatLayouts(data, models);

      expect(result.components.compo).toHaveProperty('attributes');
      expect(result.components.compo).toHaveProperty('layouts');
      expect(result.components.compo).toHaveProperty('metadatas');
      expect(result.contentType).toHaveProperty('attributes');
      expect(result.contentType).toHaveProperty('layouts');
      expect(result.contentType).toHaveProperty('metadatas');

      expect(result.contentType.layouts.edit).toEqual([
        [
          {
            name: 'dz',
            size: 12,
            fieldSchema: {
              type: 'dynamiczone',
            },
            metadatas: {
              description: '',
              editable: true,
              label: 'Dz',
              placeholder: '',
              visible: true,
            },
          },
        ],
        [
          {
            name: 'full_name',
            size: 6,
            fieldSchema: {
              type: 'string',
              required: true,
            },
            metadatas: {
              description: 'test',
              editable: true,
              label: 'Full_name',
              placeholder: '',
              visible: true,
            },
          },
          {
            name: 'city',
            size: 6,
            fieldSchema: {
              type: 'string',
              maxLength: 100,
            },
            metadatas: {
              description: '',
              editable: false,
              label: 'City',
              placeholder: '',
              visible: true,
            },
          },
        ],
        [
          {
            name: 'compo',
            size: 12,
            fieldSchema: {
              type: 'component',
              repeatable: true,
            },
            metadatas: {
              description: '',
              editable: true,
              label: 'compo',
              placeholder: '',
              visible: true,
            },
          },
        ],
      ]);
      expect(result.components.compo.layouts.edit).toEqual([
        [
          {
            name: 'full_name',
            size: 6,
            fieldSchema: {
              type: 'string',
              required: true,
            },
            metadatas: {
              description: 'test',
              editable: true,
              label: 'Full_name',
              placeholder: '',
              visible: true,
            },
          },
          {
            name: 'city',
            size: 6,
            fieldSchema: {
              type: 'string',
              maxLength: 100,
            },
            metadatas: {
              description: '',
              editable: false,
              label: 'City',
              placeholder: '',
              visible: true,
            },
          },
        ],
        [
          {
            name: 'compo',
            size: 12,
            fieldSchema: {
              type: 'component',
              repeatable: true,
            },
            metadatas: {
              description: '',
              editable: true,
              label: 'compo',
              placeholder: '',
              visible: true,
            },
          },
        ],
      ]);
    });
  });

  describe('formatLayoutWithMetas', () => {
    it('should return a layout with the metadas for each input', () => {
      const data = {
        attributes: {
          full_name: {
            type: 'string',
            required: true,
          },

          city: {
            type: 'string',
            maxLength: 100,
          },
          dz: {
            type: 'dynamiczone',
          },
          compo: {
            type: 'component',
            repeatable: true,
          },
        },
        layouts: {
          edit: [
            [{ name: 'dz', size: 12 }],
            [
              { name: 'full_name', size: 6 },
              { name: 'city', size: 6 },
            ],
            [{ name: 'compo', size: 12 }],
          ],
        },
        metadatas: {
          full_name: {
            edit: {
              description: 'test',
              editable: true,
              label: 'Full_name',
              placeholder: '',
              visible: true,
            },
          },
          city: {
            edit: {
              description: '',
              editable: false,
              label: 'City',
              placeholder: '',
              visible: true,
            },
          },
          dz: {
            edit: {
              description: '',
              editable: true,
              label: 'Dz',
              placeholder: '',
              visible: true,
            },
          },
          compo: {
            edit: {
              description: '',
              editable: true,
              label: 'compo',
              placeholder: '',
              visible: true,
            },
          },
        },
      };

      const expected = [
        [
          {
            name: 'dz',
            size: 12,
            fieldSchema: {
              type: 'dynamiczone',
            },
            metadatas: {
              description: '',
              editable: true,
              label: 'Dz',
              placeholder: '',
              visible: true,
            },
          },
        ],
        [
          {
            name: 'full_name',
            size: 6,
            fieldSchema: {
              type: 'string',
              required: true,
            },
            metadatas: {
              description: 'test',
              editable: true,
              label: 'Full_name',
              placeholder: '',
              visible: true,
            },
          },
          {
            name: 'city',
            size: 6,
            fieldSchema: {
              type: 'string',
              maxLength: 100,
            },
            metadatas: {
              description: '',
              editable: false,
              label: 'City',
              placeholder: '',
              visible: true,
            },
          },
        ],
        [
          {
            name: 'compo',
            size: 12,
            fieldSchema: {
              type: 'component',
              repeatable: true,
            },
            metadatas: {
              description: '',
              editable: true,
              label: 'compo',
              placeholder: '',
              visible: true,
            },
          },
        ],
      ];

      expect(formatLayoutWithMetas(data)).toEqual(expected);
    });
  });
});
