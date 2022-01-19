'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils/lib/errors');
const validators = require('../validators');

describe('String validator', () => {
  describe('unique', () => {
    const fakeFindOne = jest.fn();

    global.strapi = {
      db: {
        query: jest.fn(() => ({
          findOne: fakeFindOne,
        })),
      },
    };

    afterEach(() => {
      jest.clearAllMocks();
      fakeFindOne.mockReset();
    });

    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrStringUnique: { type: 'string', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'non-unique-test-data',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('non-unique-test-data');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: null,
              },
              entity: null,
            },
            { isDraft: false }
          )
          .nullable()
      );

      await validator(null);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'non-unique-test-data',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-unique-test-data')).toBe('non-unique-test-data');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrStringUnique: 'unique-test-data' });

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'unique-test-data',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('unique-test-data');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrStringUnique: 'non-updated-unique-test-data' });

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'non-updated-unique-test-data',
            },
            entity: { id: 1, attrStringUnique: 'non-updated-unique-test-data' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-updated-unique-test-data')).toBe('non-updated-unique-test-data');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('test-data');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrStringUnique: 'test-data' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: { id: 1, attrStringUnique: 'other-data' },
          },
          { isDraft: false }
        )
      );

      await validator('test-data');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrStringUnique: 'test-data' }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('minLength', () => {
    test('it does not validates the minLength constraint if the attribute minLength is not an integer', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', minLength: '123' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('a')).toBe('a');
    });

    test('it does not validates the minLength constraint if it is a draft', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', minLength: 3 },
          },
          { isDraft: true }
        )
      );

      expect(await validator('a')).toBe('a');
    });

    test('it fails the validation if the string is shorter than the define minLength', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', minLength: 3 },
          },
          { isDraft: false }
        )
      );

      try {
        await validator('a');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the minLength constraint if the string is longer than the define minLength', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', minLength: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator('this string is longer than the minLenght')).toBe(
        'this string is longer than the minLenght'
      );
    });
  });

  describe('maxLength', () => {
    test('it does not validates the maxLength constraint if the attribute maxLength is not an integer', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', maxLength: '123' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('a')).toBe('a');
    });

    test('it fails the validation if the string is longer than the define maxLength', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', maxLength: 3 },
          },
          { isDraft: false }
        )
      );

      try {
        await validator('this string is too long');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the maxLength constraint if the string is shorter than the define maxLength', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', maxLength: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator('a')).toBe('a');
    });
  });

  describe('regExp', () => {
    test('it fails the validation of an empty string for a required field', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', required: true, regex: '^\\w+$' },
          },
          { isDraft: false }
        )
      );

      try {
        await validator('');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates a string for required field according to the regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', required: true, regex: '^\\w+$' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('Strapi')).toBe('Strapi');
    });

    test('it validates an empty string for non-required field with a regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', required: false, regex: '^\\w+$' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('')).toBe('');
    });

    test('it validates a string for non-required field according to the regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.string(
          {
            attr: { type: 'string', required: false, regex: '^\\w+$' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('Strapi')).toBe('Strapi');
    });
  });
});
