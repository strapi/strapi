'use strict';

const strapiUtils = require('@strapi/utils');
const {
  errors: { YupValidationError },
} = require('@strapi/utils');
const validators = require('../validators');

describe('Datetime validator', () => {
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
        attrDateTimeUnique: { type: 'datetime', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.datetime(
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
        validators
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
        validators.datetime(
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
        validators.datetime(
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
        validators.datetime(
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
        validators.datetime(
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
        validators.datetime(
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
});
