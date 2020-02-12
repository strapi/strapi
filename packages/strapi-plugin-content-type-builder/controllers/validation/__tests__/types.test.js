const getTypeValidator = require('../types');

describe('Type validators', () => {
  describe('UID type validator', () => {
    test('Target field can be null', () => {
      const attributes = {
        slug: {
          type: 'uid',
        },
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
        attributes,
      });

      expect(validator.isValidSync(attributes.slug)).toBe(true);
    });

    test('Target field must have a type', () => {
      const attributes = {
        relation: {
          nature: 'oneToOne',
        },
        slug: {
          type: 'uid',
          targetField: 'relation',
        },
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
    ])('Target field cannot be %s', type => {
      const attributes = {
        title: {
          type,
        },
        slug: {
          type: 'uid',
          targetField: 'title',
        },
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
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
      };

      const validator = getTypeValidator(attributes.slug, {
        types: ['uid'],
        modelType: 'collectionType',
        attributes,
      });

      expect(() => validator.validateSync(attributes.slug)).toThrow(
        'cannot define a default UID if the targetField is set'
      );
    });
  });
});
