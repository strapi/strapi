/* eslint-disable @typescript-eslint/ban-ts-comment */
import {
  validateKind,
  validateUpdateContentTypeInput,
  validateContentTypeInput,
  CreateContentTypeInput,
} from '../content-type';

describe('Content type validator', () => {
  global.strapi = {
    contentTypes: {},
    plugins: {
      'content-type-builder': {
        services: {
          builder: {
            getReservedNames() {
              return {
                models: ['reserved-name'],
                attributes: ['thisIsReserved'],
              };
            },
          },
        },
      },
    },
  } as any;

  describe('validateKind', () => {
    it('Only allows for single and collection types', async () => {
      await expect(validateKind('wrong')).rejects.toBeDefined();
    });

    it('allows singleType and collectionType', async () => {
      await expect(validateKind('singleType')).resolves.toBe('singleType');
      await expect(validateKind('collectionType')).resolves.toBe('collectionType');
    });

    it('allows undefined', async () => {
      // @ts-ignore-error test that it can handle undefined as expected, even if it's invalid typescript
      await expect(validateKind()).resolves.toBeUndefined();
    });
  });

  describe('Prevents use of reservedNames in attributes', () => {
    test('Throws when reserved names are used', async () => {
      const data = {
        contentType: {
          singularName: 'test',
          pluralName: 'tests',
          displayName: 'Test',
          attributes: {
            thisIsReserved: {
              type: 'string',
              default: '',
            },
          },
        },
      } as unknown as CreateContentTypeInput;

      expect.assertions(1);

      await validateUpdateContentTypeInput(data).catch((err) => {
        expect(err).toMatchObject({
          name: 'ValidationError',
          message: 'Attribute keys cannot be one of __component, __contentType, thisIsReserved',
          details: {
            errors: [
              {
                path: ['contentType', 'attributes', 'thisIsReserved'],
                message:
                  'Attribute keys cannot be one of __component, __contentType, thisIsReserved',
                name: 'ValidationError',
              },
            ],
          },
        });
      });
    });

    test('Uses snake_case to compare reserved name', async () => {
      const data = {
        contentType: {
          singularName: 'test',
          pluralName: 'tests',
          displayName: 'Test',
          attributes: {
            THIS_IS_RESERVED: {
              type: 'string',
              default: '',
            },
          },
        },
      } as unknown as CreateContentTypeInput;

      expect.assertions(1);

      await validateUpdateContentTypeInput(data).catch((err) => {
        expect(err).toMatchObject({
          name: 'ValidationError',
          message: 'Attribute keys cannot be one of __component, __contentType, thisIsReserved',
          details: {
            errors: [
              {
                path: ['contentType', 'attributes', 'THIS_IS_RESERVED'],
                message:
                  'Attribute keys cannot be one of __component, __contentType, thisIsReserved',
                name: 'ValidationError',
              },
            ],
          },
        });
      });
    });
  });

  describe('Prevents use of reservedNames in models', () => {
    const reservedNames = ['singularName', 'pluralName'];

    test.each(reservedNames)('Throws when reserved model names are used in %s', async (name) => {
      const data = {
        contentType: {
          singularName: name === 'singularName' ? 'reserved-name' : 'not-reserved-single',
          pluralName: name === 'pluralName' ? 'reserved-name' : 'not-reserved-plural',
          displayName: 'Test',
          attributes: {
            notReserved: {
              type: 'string',
              default: '',
            },
          },
        },
      } as unknown as CreateContentTypeInput;

      expect.assertions(1);

      await validateUpdateContentTypeInput(data).catch((err) => {
        expect(err).toMatchObject({
          name: 'ValidationError',
          message: `Content Type name cannot be one of reserved-name`,
          details: {
            errors: [
              {
                path: ['contentType', name],
                message: `Content Type name cannot be one of reserved-name`,
                name: 'ValidationError',
              },
            ],
          },
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
      } as unknown as CreateContentTypeInput;

      expect.assertions(1);

      await validateContentTypeInput(input).then((data: any) => {
        expect(data.contentType.attributes).toBe(input?.contentType?.attributes);
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
            uid: 'edit.edit',
            displayName: 'test',
            icon: 'calendar',
            category: 'test',
            attributes: {
              title: {
                type: 'string',
                default: '',
              },
            },
          },
          {
            tmpUID: 'random.random',
            displayName: 'test2',
            icon: 'calendar',
            category: 'test',
            attributes: {
              title: {
                type: 'string',
                default: '',
              },
            },
          },
        ],
      } as any;

      await validateUpdateContentTypeInput(data).then(() => {
        expect(data.contentType.attributes.slug.default).toBeUndefined();
        expect(data.components[0]?.attributes?.title.default).toBeUndefined();
        expect(data.components[1]?.attributes?.title.default).toBe('');
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
      } as unknown as CreateContentTypeInput;

      expect.assertions(1);

      await validateUpdateContentTypeInput(data).then(() => {
        // @ts-expect-error We are confirming that this invalid field does not exist
        expect(data.contentType?.attributes?.slug.targetField).toBeUndefined();
      });
    });

    // TODO: This test seems like it can be completely removed because it's from v3
    test('Can use custom keys', async () => {
      const input: CreateContentTypeInput = {
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
      } as any;

      expect.assertions(1);

      await validateUpdateContentTypeInput(input).then((data) => {
        expect(data.contentType.attributes).toBe(input.contentType?.attributes);
      });
    });
  });
});
