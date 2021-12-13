'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('../../../../../utils/lib/errors');
const entityValidator = require('../validators');

describe('Entity validator', () => {
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

  describe('String RegExp validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrStringRequiredRegex: { type: 'string', required: true },
        attrStringNotRequiredRegex: { type: 'string', required: false },
      },
    };

    test('It fails the validation of an empty string for a required field', () => {
      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          {
            attr: { type: 'string', required: true, regex: '^\\d+$' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringRequiredRegex',
              value: '',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      return expect(validator('')).rejects.toBeInstanceOf(YupValidationError);
    });

    test('It validates successfully for a string that follows regex for a required field', () => {
      const value = '1234';

      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          {
            attr: { type: 'string', required: true, regex: '^\\d+$' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringRequiredRegex',
              value,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      return expect(validator(value)).resolves.toEqual(value);
    });

    test('It validates empty string successfully for non-required field with regex constraint', () => {
      const value = '';

      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          {
            attr: { type: 'string', required: false, regex: '^\\d+$' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringNotRequiredRegex',
              value,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      return expect(validator(value)).resolves.toEqual(value);
    });

    test('It validates successfully for string that follows regex for a non-required field', () => {
      const value = '1234';

      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          {
            attr: { type: 'string', required: false, regex: '^\\d+$' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringNotRequiredRegex',
              value,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      return expect(validator(value)).resolves.toEqual(value);
    });
  });

  describe('String unique validator', () => {
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
        entityValidator.string(
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
        entityValidator
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
        entityValidator.string(
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
        entityValidator.string(
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
        entityValidator.string(
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
        entityValidator.string(
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
        entityValidator.string(
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

  describe('Integer unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      uid: 'test-uid',
      modelName: 'test-model',
      privateAttributes: [],
      options: {},
      attributes: {
        attrIntegerUnique: { type: 'integer', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          {
            attr: { type: 'integer' },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 1 },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(1);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .integer(
            {
              attr: { type: 'integer', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrIntegerUnique', value: null },
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
        entityValidator.integer(
          {
            attr: { type: 'integer', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 2 },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrIntegerUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          {
            attr: { type: 'integer', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 2 },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator(2);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrIntegerUnique: 3 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          {
            attr: { type: 'integer', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 3 },
            entity: { id: 1, attrIntegerUnique: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          {
            attr: { type: 'integer', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 4 },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(4);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrIntegerUnique: 4 },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          {
            attr: { type: 'integer', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrIntegerUnique', value: 5 },
            entity: { id: 1, attrIntegerUnique: 42 },
          },
          { isDraft: false }
        )
      );

      await validator(5);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrIntegerUnique: 5 }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('BigInteger unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrBigIntegerUnique: { type: 'biginteger', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 1,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(1);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .biginteger(
            {
              attr: { type: 'biginteger', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrBigIntegerUnique',
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
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 1,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrBigIntegerUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 2,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator(2);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrBigIntegerUnique: 3 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 3,
            },
            entity: { id: 1, attrBigIntegerUnique: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 4,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(4);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrBigIntegerUnique: 4 },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          {
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: 5,
            },
            entity: { id: 1, attrBigIntegerUnique: 42 },
          },
          { isDraft: false }
        )
      );

      await validator(5);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrBigIntegerUnique: 5 }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('Float unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrFloatUnique: { type: 'float', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          {
            attr: { type: 'float' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 1,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(1);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .float(
            {
              attr: { type: 'float', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrFloatUnique',
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
        entityValidator.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 1,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrFloatUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 2,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator(2);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrFloatUnique: 3 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 3,
            },
            entity: { id: 1, attrFloatUnique: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 4,
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator(4);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrFloatUnique: 4 },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrFloatUnique',
              value: 5,
            },
            entity: { id: 1, attrFloatUnique: 42 },
          },
          { isDraft: false }
        )
      );

      await validator(5);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrFloatUnique: 5 }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('UID unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrUidUnique: { type: 'uid' },
      },
    };

    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .uid(
            {
              attr: { type: 'uid', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: null },
              entity: null,
            },
            { isDraft: false }
          )
          .nullable()
      );

      await validator(null);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it always validates the unique constraint even if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrUidUnique: 'non-unique-uid' },
      });
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('unique-uid');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unchanged-unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unchanged-unique-uid' },
            entity: { id: 1, attrUidUnique: 'unchanged-unique-uid' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('unchanged-unique-uid')).toBe('unchanged-unique-uid');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('unique-uid');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrUidUnique: 'unique-uid' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: { id: 1, attrUidUnique: 'other-uid' },
          },
          { isDraft: false }
        )
      );

      await validator('unique-uid');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrUidUnique: 'unique-uid' }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('Date unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrDateUnique: { type: 'date', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          {
            attr: { type: 'date' },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .date(
            {
              attr: { type: 'date', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrDateUnique', value: null },
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
        entityValidator.date(
          {
            attr: { type: 'date', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('2021-11-29')).toBe('2021-11-29');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrDateUnique: '2021-11-29' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          {
            attr: { type: 'date', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('2021-11-29');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrDateUnique: '2021-11-29' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          {
            attr: { type: 'date', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: { id: 1, attrDateUnique: '2021-11-29' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('2021-11-29')).toBe('2021-11-29');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          {
            attr: { type: 'date', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrDateUnique: '2021-11-29' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          {
            attr: { type: 'date', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateUnique', value: '2021-11-29' },
            entity: { id: 1, attrDateUnique: '2021-12-15' },
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrDateUnique: '2021-11-29' }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('DateTime unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrDateTimeUnique: { type: 'datetime', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          {
            attr: { type: 'datetime' },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: { id: 1, attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29T00:00:00.000Z');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .datetime(
            {
              attr: { type: 'datetime', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrDateTimeUnique', value: null },
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
        entityValidator.datetime(
          {
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          {
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('2021-11-29T00:00:00.000Z');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          {
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: { id: 1, attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          {
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29T00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          {
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
            entity: { id: 1, attrDateTimeUnique: '2021-12-25T00:00:00.000Z' },
          },
          { isDraft: false }
        )
      );

      await validator('2021-11-29T00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('Time unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrTimeUnique: { type: 'time', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          {
            attr: { type: 'time' },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('00:00:00.000Z');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .time(
            {
              attr: { type: 'time', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrTimeUnique', value: null },
              entity: { id: 1, attrTimeUnique: '00:00:00.000Z' },
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
        entityValidator.time(
          {
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimeUnique: '00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          {
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('00:00:00.000Z');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrTimeUnique: '00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          {
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: { id: 1, attrTimeUnique: '00:00:00.000Z' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          {
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrTimeUnique: '00:00:00.000Z' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          {
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
            entity: { id: 1, attrTimeUnique: '01:00:00.000Z' },
          },
          { isDraft: false }
        )
      );

      await validator('00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrTimeUnique: '00:00:00.000Z' }, { $not: { id: 1 } }] },
      });
    });
  });

  describe('Timestamp unique validator', () => {
    const fakeModel = {
      kind: 'contentType',
      modelName: 'test-model',
      uid: 'test-uid',
      privateAttributes: [],
      options: {},
      attributes: {
        attrTimestampUnique: { type: 'timestamp', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp' },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('1638140400');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
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
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('1638140400');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: { id: 1, attrTimestampUnique: '1638140400' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('1638140400');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrTimestampUnique: '1638140400' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          {
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
              value: '1638140400',
            },
            entity: { id: 1, attrTimestampUnique: '1000000000' },
          },
          { isDraft: false }
        )
      );

      await validator('1638140400');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrTimestampUnique: '1638140400' }, { $not: { id: 1 } }] },
      });
    });
  });
});
