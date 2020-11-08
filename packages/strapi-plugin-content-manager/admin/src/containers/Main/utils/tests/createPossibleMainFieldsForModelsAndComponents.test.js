import createPossibleMainFieldsForModelsAndComponents from '../createPossibleMainFieldsForModelsAndComponents';

describe('CONTENT MANAGER | containers | Main | utils', () => {
  describe('createPossibleMainFieldsForModelsAndComponents', () => {
    it('should return an object with key/value corresponding to the uid of the model and an array with its possible main fields', () => {
      const models = [
        {
          uid: 'application::address.address',
          schema: {
            name: 'address',
            description: '',
            connection: 'default',
            collectionName: '',
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
                targetModel: 'application::category.category',
                relationType: 'manyToMany',
              },
              cover: { type: 'media', multiple: false, required: false },
              images: { type: 'media', multiple: true, required: false },
              full_name: { type: 'string', required: true },
              created_at: { type: 'timestamp' },
              updated_at: { type: 'timestamp' },
            },
          },
        },

        {
          uid: 'application::menusection.menusection',
          schema: {
            name: 'menusection',
            description: '',
            connection: 'default',
            collectionName: '',
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
                targetModel: 'application::menu.menu',
                relationType: 'manyToOne',
              },
              created_at: { type: 'timestamp' },
              updated_at: { type: 'timestamp' },
            },
          },
        },
      ];

      const expected = {
        'application::address.address': [
          'id',
          'city',
          'postal_coder',
          'full_name',
          'created_at',
          'updated_at',
        ],
        'application::menusection.menusection': ['id', 'name', 'created_at', 'updated_at'],
      };

      expect(createPossibleMainFieldsForModelsAndComponents(models)).toEqual(expected);
    });
  });
});
