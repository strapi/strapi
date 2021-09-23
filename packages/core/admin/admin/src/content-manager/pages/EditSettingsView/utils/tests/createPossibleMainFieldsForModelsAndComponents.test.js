import createPossibleMainFieldsForModelsAndComponents from '../createPossibleMainFieldsForModelsAndComponents';

describe('CONTENT MANAGER | containers | Main | utils', () => {
  describe('createPossibleMainFieldsForModelsAndComponents', () => {
    it('should return an object with key/value corresponding to the uid of the model and an array with its possible main fields', () => {
      const models = [
        {
          uid: 'api::address.address',
          attributes: {
            id: { type: 'integer' },
            geolocation: { type: 'json', required: true },
            city: { type: 'string', required: true },
            postal_coder: { type: 'string' },
            categories: {
              collection: 'category',
              via: 'addresses',
              dominant: true,
              attribute: 'category',
              column: 'id',
              isVirtual: true,
              type: 'relation',
              targetModel: 'api::category.category',
              relationType: 'manyToMany',
            },
            cover: { type: 'media', multiple: false, required: false },
            images: { type: 'media', multiple: true, required: false },
            full_name: { type: 'string', required: true },
            createdAt: { type: 'timestamp' },
            updatedAt: { type: 'timestamp' },
          },
        },

        {
          uid: 'api::menusection.menusection',
          attributes: {
            id: { type: 'integer' },
            name: { type: 'string', required: true, minLength: 6 },
            dishes: {
              component: 'default.dish',
              type: 'component',
              repeatable: true,
            },
            menu: {
              model: 'menu',
              via: 'menusections',
              type: 'relation',
              targetModel: 'api::menu.menu',
              relationType: 'manyToOne',
            },
            createdAt: { type: 'timestamp' },
            updatedAt: { type: 'timestamp' },
          },
        },
      ];

      const expected = {
        'api::address.address': [
          'id',
          'city',
          'postal_coder',
          'full_name',
          'createdAt',
          'updatedAt',
        ],
        'api::menusection.menusection': ['id', 'name', 'createdAt', 'updatedAt'],
      };

      expect(createPossibleMainFieldsForModelsAndComponents(models)).toEqual(expected);
    });
  });
});
