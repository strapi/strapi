'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils/lib/errors');
const validators = require('../validators');

describe('Float validator', () => {
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
      uid: 'test-uid',
      modelName: 'test-model',
      privateAttributes: [],
      options: {},
      attributes: {
        attrFloatUnique: { type: 'float', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float' },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 1 },
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
        validators
          .float(
            {
              attr: { type: 'float', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrFloatUnique', value: null },
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
        validators.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 2 },
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
        validators.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 2 },
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
        validators.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 3 },
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
        validators.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 4 },
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
        validators.float(
          {
            attr: { type: 'float', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrFloatUnique', value: 5 },
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

  describe('min', () => {
    test('it does not validates the min constraint if the attribute min is not a number', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', minLength: '123' },
          },
          { isDraft: false }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation if the float is lower than the define min', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', min: 3 },
          },
          { isDraft: false }
        )
      );

      try {
        await validator(1);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the min constraint if the float is higher than the define min', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', min: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator(4)).toBe(4);
    });
  });

  describe('max', () => {
    test('it does not validates the max constraint if the attribute max is not an float', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', maxLength: '123' },
          },
          { isDraft: false }
        )
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation if the number is float than the define max', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', max: 3 },
          },
          { isDraft: false }
        )
      );

      try {
        await validator(4);
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the max constraint if the float is lower than the define max', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.float(
          {
            attr: { type: 'float', max: 3 },
          },
          { isDraft: false }
        )
      );

      expect(await validator(2)).toBe(2);
    });
  });
});
