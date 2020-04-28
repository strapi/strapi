const { validateKind, validateUpdateContentTypeInput } = require('../content-type');

describe('Content type validator', () => {
  global.strapi = {
    plugins: {
      'content-type-builder': {
        services: {
          builder: {
            getReservedNames() {
              return {
                models: [],
                attributes: ['thisIsReserved'],
              };
            },
          },
        },
      },
    },
  };

  describe('validateKind', () => {
    it('Only allows for single and collection types', async () => {
      await expect(validateKind('wrong')).rejects.toBeDefined();
    });

    it('allows singleType and collectionType', async () => {
      await expect(validateKind('singleType')).resolves.toBe('singleType');
      await expect(validateKind('collectionType')).resolves.toBe('collectionType');
    });

    it('allows undefined', async () => {
      await expect(validateKind()).resolves.toBeUndefined();
    });
  });

  describe('Prevents use of reservedNames', () => {
    test('Throws when resverd names are used', async () => {
      const data = {
        contentType: {
          name: 'test',
          attributes: {
            thisIsReserved: {
              type: 'string',
              default: '',
            },
          },
        },
      };

      await validateUpdateContentTypeInput(data).catch(err => {
        expect(err).toMatchObject({
          'contentType.attributes.thisIsReserved': [
            expect.stringMatching('Attribute keys cannot be one of'),
          ],
        });
      });
    });
  });

  describe('validateUpdateContentTypeInput', () => {
    test('Deletes empty defaults', async () => {
      const data = {
        contentType: {
          name: 'test',
          attributes: {
            slug: {
              type: 'string',
              default: '',
            },
          },
        },
        components: [
          {
            uid: 'edit',
            icon: 'star',
            name: 'test',
            category: 'test',
            attributes: {
              title: {
                type: 'string',
                default: '',
              },
            },
          },
          {
            tmpUID: 'random',
            icon: 'star',
            name: 'test2',
            category: 'test',
            attributes: {
              title: {
                type: 'string',
                default: '',
              },
            },
          },
        ],
      };

      await validateUpdateContentTypeInput(data).then(() => {
        expect(data.contentType.attributes.slug.default).toBeUndefined();
        expect(data.components[0].attributes.title.default).toBeUndefined();
        expect(data.components[1].attributes.title.default).toBe('');
      });
    });

    test('Deleted UID target fields are removed from input data', async () => {
      const data = {
        contentType: {
          name: 'test',
          attributes: {
            slug: {
              type: 'uid',
              targetField: 'deletedField',
            },
          },
        },
      };

      expect.assertions(1);

      await validateUpdateContentTypeInput(data).then(() => {
        expect(data.contentType.attributes.slug.targetField).toBeUndefined();
      });
    });
  });
});
