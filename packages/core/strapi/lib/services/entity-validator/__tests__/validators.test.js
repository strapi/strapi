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
          { type: 'string' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: null,
            data: 'non-unique-test-data',
          }
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
            { type: 'string', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrStringUnique',
              entity: null,
              data: null,
            }
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
          { type: 'string', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: null,
            data: 'non-unique-test-data',
          }
        )
      );

      expect(await validator('non-unique-test-data')).toBe('non-unique-test-data');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrStringUnique: 'unique-test-data' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          { type: 'string', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: null,
            data: 'unique-test-data',
          }
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
          { type: 'string', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: { id: 1, attrStringUnique: 'non-updated-unique-test-data' },
            data: 'non-updated-unique-test-data',
          }
        )
      );

      expect(await validator('non-updated-unique-test-data')).toBe('non-updated-unique-test-data');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.string(
          { type: 'string', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: null,
            data: 'test-data',
          }
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
          { type: 'string', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrStringUnique',
            entity: { id: 1 },
            data: 'test-data',
          }
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
          { type: 'integer' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: null,
            data: 1,
          }
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
            { type: 'integer', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrIntegerUnique',
              entity: null,
              data: null,
            }
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
          { type: 'integer', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: null,
            data: 1,
          }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrIntegerUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          { type: 'integer', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: null,
            data: 2,
          }
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
          { type: 'integer', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: { attrIntegerUnique: 3 },
            data: 3,
          }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.integer(
          { type: 'integer', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: null,
            data: 4,
          }
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
          { type: 'integer', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrIntegerUnique',
            entity: { id: 1 },
            data: 5,
          }
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
          { type: 'biginteger' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: null,
            data: 1,
          }
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
            { type: 'biginteger', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrBigIntegerUnique',
              entity: null,
              data: null,
            }
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
          { type: 'biginteger', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: null,
            data: 1,
          }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrBigIntegerUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          { type: 'biginteger', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: null,
            data: 2,
          }
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
          { type: 'biginteger', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: { attrBigIntegerUnique: 3 },
            data: 3,
          }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.biginteger(
          { type: 'biginteger', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: null,
            data: 4,
          }
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
          { type: 'biginteger', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrBigIntegerUnique',
            entity: { id: 1 },
            data: 5,
          }
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
          { type: 'float' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: null,
            data: 1,
          }
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
            { type: 'float', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrFloatUnique',
              entity: null,
              data: null,
            }
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
          { type: 'float', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: null,
            data: 1,
          }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrFloatUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          { type: 'float', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: null,
            data: 2,
          }
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
          { type: 'float', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: { attrFloatUnique: 3 },
            data: 3,
          }
        )
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.float(
          { type: 'float', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: null,
            data: 4,
          }
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
          { type: 'float', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrFloatUnique',
            entity: { id: 1 },
            data: 5,
          }
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
          { type: 'uid', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: null,
            data: 'non-unique-uid',
          }
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator
          .uid(
            { type: 'uid', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrUidUnique',
              entity: null,
              data: null,
            }
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
          { type: 'uid' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: null,
            data: 'non-unique-uid',
          }
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
          { type: 'uid', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: null,
            data: 'unique-uid',
          }
        )
      );

      try {
        await validator(2);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unchanged-unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          { type: 'uid', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: { attrUidUnique: 'unchanged-unique-uid' },
            data: 'unchanged-unique-uid',
          }
        )
      );

      expect(await validator('unchanged-unique-uid')).toBe('unchanged-unique-uid');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.uid(
          { type: 'uid', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: null,
            data: 'unique-uid',
          }
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
          { type: 'uid', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrUidUnique',
            entity: { id: 1 },
            data: 'unique-uid',
          }
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
          { type: 'date' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: null,
            data: '2021-11-29',
          }
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
            { type: 'date', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrDateUnique',
              entity: null,
              data: null,
            }
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
          { type: 'date', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: null,
            data: '2021-11-29',
          }
        )
      );

      expect(await validator('2021-11-29')).toBe('2021-11-29');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrDateUnique: '2021-11-29' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          { type: 'date', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: null,
            data: '2021-11-29',
          }
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
          { type: 'date', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: { attrDateUnique: '2021-11-29' },
            data: '2021-11-29',
          }
        )
      );

      expect(await validator('2021-11-29')).toBe('2021-11-29');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.date(
          { type: 'date', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: null,
            data: '2021-11-29',
          }
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
          { type: 'date', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateUnique',
            entity: { id: 1 },
            data: '2021-11-29',
          }
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
          { type: 'datetime' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: null,
            data: '2021-11-29T00:00:00.000Z',
          }
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
            { type: 'datetime', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrDateTimeUnique',
              entity: null,
              data: null,
            }
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
          { type: 'datetime', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: null,
            data: '2021-11-29T00:00:00.000Z',
          }
        )
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          { type: 'datetime', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: null,
            data: '2021-11-29T00:00:00.000Z',
          }
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
          { type: 'datetime', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: { attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
            data: '2021-11-29T00:00:00.000Z',
          }
        )
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.datetime(
          { type: 'datetime', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: null,
            data: '2021-11-29T00:00:00.000Z',
          }
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
          { type: 'datetime', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrDateTimeUnique',
            entity: { id: 1 },
            data: '2021-11-29T00:00:00.000Z',
          }
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
          { type: 'time' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: null,
            data: '00:00:00.000Z',
          }
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
            { type: 'time', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrTimeUnique',
              entity: null,
              data: null,
            }
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
          { type: 'time', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: null,
            data: '00:00:00.000Z',
          }
        )
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimeUnique: '00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          { type: 'time', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: null,
            data: '00:00:00.000Z',
          }
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
          { type: 'time', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: { attrTimeUnique: '00:00:00.000Z' },
            data: '00:00:00.000Z',
          }
        )
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.time(
          { type: 'time', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: null,
            data: '00:00:00.000Z',
          }
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
          { type: 'time', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimeUnique',
            entity: { id: 1 },
            data: '00:00:00.000Z',
          }
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
          { type: 'timestamp' },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: null,
            data: '1638140400',
          }
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
            { type: 'timestamp', unique: true },
            {
              isDraft: false,
              model: fakeModel,
              attributeName: 'attrTimestampUnique',
              entity: null,
              data: null,
            }
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
          { type: 'timestamp', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: null,
            data: '1638140400',
          }
        )
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          { type: 'timestamp', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: null,
            data: '1638140400',
          }
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
          { type: 'timestamp', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: { attrTimestampUnique: '1638140400' },
            data: '1638140400',
          }
        )
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        entityValidator.timestamp(
          { type: 'timestamp', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: null,
            data: '1638140400',
          }
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
          { type: 'timestamp', unique: true },
          {
            isDraft: false,
            model: fakeModel,
            attributeName: 'attrTimestampUnique',
            entity: { id: 1 },
            data: '1638140400',
          }
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
