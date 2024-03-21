import type { Schema, Struct } from '@strapi/types';
import { getTypeValidator } from '../types';

describe('Type validators', () => {
  test('pluginOptions can be used', () => {
    const attributes = {
      title: {
        type: 'string',
        pluginOptions: {
          i18n: {
            localized: false,
          },
        },
      },
    } satisfies Struct.SchemaAttributes;

    const validator = getTypeValidator(attributes.title, {
      types: ['string'],
      attributes,
    });

    expect(validator.isValidSync(attributes.title)).toBe(true);
  });

  test('can use custom keys', () => {
    const attributes = {
      title: {
        type: 'string',
        // @ts-expect-error - As of now, custom keys are not typed in schema attributes
        myCustomKey: true,
      },
    } satisfies Struct.SchemaAttributes;

    const validator = getTypeValidator(attributes.title, {
      types: ['string'],
      attributes,
    });

    expect(validator.isValidSync(attributes.title)).toBe(true);
  });

  describe('Dynamiczone type validator', () => {
    test('Components cannot be empty', () => {
      const attributes = {
        dz: {
          type: 'dynamiczone',
          components: [],
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.dz, {
        types: ['dynamiczone'],
        attributes,
      });

      expect(validator.isValidSync(attributes.dz)).toBeFalsy();
    });

    test('Components must have at least one item', () => {
      const attributes = {
        dz: {
          type: 'dynamiczone',
          components: ['default.compoA', 'default.compoB'],
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.dz, {
        types: ['dynamiczone'],
        attributes,
      });

      expect(validator.isValidSync(attributes.dz)).toBeTruthy();
    });
  });

  describe('UID type validator', () => {
    test('Target field can be null', () => {
      const attributes = {
        slug: {
          type: 'uid',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(true);
    });

    test('Target field must point to an existing field', () => {
      const attributes = {
        slug: {
          type: 'uid',
          targetField: 'unknown',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(false);
    });

    test('Target field can be a string', () => {
      const attributes = {
        title: {
          type: 'string',
        },
        slug: {
          type: 'uid',
          targetField: 'title',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(true);
    });

    test('Target field can be a text', () => {
      const attributes = {
        title: {
          type: 'text',
        },
        slug: {
          type: 'uid',
          targetField: 'title',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(true);
    });

    test('Target field must have a type', () => {
      const attributes = {
        relation: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::foo.foo',
        },
        slug: {
          type: 'uid',
          targetField: 'relation',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(false);
    });

    test.each([
      'media',
      'richtext',
      'json',
      'enumeration',
      'password',
      'email',
      'integer',
      'biginteger',
      'float',
      'decimal',
      'date',
      'time',
      'datetime',
      'timestamp',
      'boolean',
    ] as const)('Target field cannot be %s', (type) => {
      const attributes = {
        title: {
          type,
        } as Schema.Attribute.AnyAttribute,
        slug: {
          type: 'uid',
          targetField: 'title',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(false);
    });

    test.each([
      ['basic-uid-value1911', true],
      ['uid_with_underscore', true],
      ['tilde~_isAllowed', true],
      ['dots.are.allowed', true],
      ['no-accentsé', false],
      ['no-special$-chars&@', false],
      ['some-invalid&é&e-uid', false],
      ['some/azdazd/', false],
      ['some(azdazd)', false],
      ['some=azdazd', false],
      ['some?azdazd=azdaz', false],
    ])('Default value must match regex %s => %s', (value, isValid) => {
      const attributes = {
        slug: {
          type: 'uid',
          default: value,
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(isValid);
    });

    test('Default should not be defined if targetField is defined', () => {
      const attributes = {
        title: {
          type: 'string',
        },
        slug: {
          type: 'uid',
          targetField: 'title',
          default: 'some-value',
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(() => validator.validateSync(attributes.slug)).toThrow(
        'cannot define a default UID if the targetField is set'
      );
    });

    test('maxLength cannot be smaller then minLength', () => {
      const attributes = {
        slug: {
          type: 'uid',
          minLength: 120,
          maxLength: 119,
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(() => validator.validateSync(attributes.slug)).toThrow(
        'maxLength must be greater or equal to minLength'
      );
    });

    test('maxLength can be equal to minLength', () => {
      const attributes = {
        slug: {
          type: 'uid',
          minLength: 120,
          maxLength: 120,
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(true);
    });

    test('maxLength cannot be over 256', () => {
      const attributes = {
        slug: {
          type: 'uid',
          maxLength: 257,
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(false);
    });
  });

  describe('media type', () => {
    test('Validates allowedTypes', () => {
      // @ts-expect-error - Silence the cast as Struct.SchemaAttributes since allowedTypes expects one of 'audios',
      //                    'files', 'images' or 'videos'. This value is tested on purpose to catch an error
      const attributes = {
        img: {
          type: 'media',
          allowedTypes: ['nonexistent'],
        },
      } as Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.img, {
        types: ['media'],
        attributes,
      });

      expect(validator.isValidSync(attributes.img)).toBe(false);
    });

    test('Cannot set all with other allowedTypes', () => {
      const attributes = {
        img: {
          type: 'media',
          // FIXME: Added an any cast as allowedTypes should have a different definition in the CTB context (allows 'all')
          allowedTypes: ['all', 'videos'] as any,
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.img, {
        types: ['media'],
        attributes,
      });

      expect(validator.isValidSync(attributes.img)).toBe(false);
    });

    test('Can set multiple allowedTypes', () => {
      const attributes = {
        img: {
          type: 'media',
          allowedTypes: ['files', 'videos'],
        },
      } satisfies Struct.SchemaAttributes;

      const validator = getTypeValidator(attributes.img, {
        types: ['media'],
        attributes,
      });

      expect(validator.isValidSync(attributes.img)).toBe(true);
    });

    test.each(['audios', 'images', 'files', 'videos'] as const)(
      '%s is an allowed types',
      (type) => {
        const attributes = {
          img: {
            type: 'media',
            allowedTypes: [type],
          },
        } satisfies Struct.SchemaAttributes;

        const validator = getTypeValidator(attributes.img, {
          types: ['media'],
          attributes,
        });

        expect(validator.isValidSync(attributes.img)).toBe(true);
      }
    );
  });
});
