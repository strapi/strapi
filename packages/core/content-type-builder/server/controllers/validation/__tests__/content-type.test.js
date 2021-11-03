'use strict';

const {
  validateKind,
  validateUpdateContentTypeInput,
  validateContentTypeInput,
} = require('../content-type');

describe('Content type validator', () => {
  global.strapi = {
    contentTypes: {},
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
    test('Throws when reserved names are used', async () => {
      const data = {
        contentType: {
          displayName: 'test',
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

  describe('Prevents use of same singularName and pluralName', () => {
    test('Throws when using same singularName and pluralName', async () => {
      const data = {
        contentType: {
          displayName: 'news',
          singularName: 'news',
          pluralName: 'news',
          attributes: {
            title: {
              type: 'string',
            },
          },
        },
      };

      await validateContentTypeInput(data).catch(err => {
        expect(err).toMatchObject({
          contentType: [expect.stringMatching('singularName and pluralName should be different')],
        });
      });
    });
  });

  describe('validateContentTypeInput', () => {
    test('Can use custom keys', async () => {
      const input = {
        contentType: {
          displayName: 'test',
          singularName: 'test',
          pluralName: 'tests',
          attributes: {
            views: {
              type: 'integer',
              myCustomKey: 10000,
            },
            title: {
              type: 'string',
              myCustomKey: true,
            },
          },
        },
      };

      expect.assertions(1);

      await validateContentTypeInput(input).then(data => {
        expect(data.contentType.attributes).toBe(input.contentType.attributes);
      });
    });
  });

  describe('validateUpdateContentTypeInput', () => {
    test('Deletes empty defaults', async () => {
      const data = {
        contentType: {
          displayName: 'test',
          singularName: 'test',
          pluralName: 'tests',
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
            displayName: 'test',
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
            displayName: 'test2',
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
          displayName: 'test',
          singularName: 'test',
          pluralName: 'tests',
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

    test('Can use custom keys', async () => {
      const input = {
        contentType: {
          displayName: 'test',
          singularName: 'test',
          pluralName: 'tests',
          attributes: {
            views: {
              type: 'integer',
              myCustomKey: 10000,
            },
            title: {
              type: 'string',
              myCustomKey: true,
            },
          },
        },
      };

      expect.assertions(1);

      await validateUpdateContentTypeInput(input).then(data => {
        expect(data.contentType.attributes).toBe(input.contentType.attributes);
      });
    });
  });
});
