import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import validators from '../validators';

describe('BigInteger validator', () => {
  const fakeModel: Schema.ContentType = {
    modelType: 'contentType',
    kind: 'collectionType',
    modelName: 'test-model',
    globalId: 'test-model',
    uid: 'api::test.test-uid',
    info: {
      displayName: 'Test model',
      singularName: 'test-model',
      pluralName: 'test-models',
    },
    options: {},
    attributes: {
      attrBigIntegerUnique: { type: 'biginteger', unique: true },
    },
  };

  describe('unique', () => {
    const fakeFindOne = jest.fn();

    global.strapi = {
      query: jest.fn(() => ({
        findOne: fakeFindOne,
      })),
    } as any;

    afterEach(() => {
      jest.clearAllMocks();
      fakeFindOne.mockReset();
    });

    test('it does not validate the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger' },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 1,
          },
          entity: null,
        })
      );

      await validator(1);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validate the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .biginteger({
            attr: { type: 'biginteger', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrBigIntegerUnique',
              value: null,
            },
            entity: null,
          })
          .nullable()
      );

      await validator(null);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 1,
          },
          entity: null,
        })
      );

      expect(await validator(1)).toBe(1);
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrBigIntegerUnique: 2 });

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 2,
          },
          entity: null,
        })
      );

      try {
        await validator(2);
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrBigIntegerUnique: 3 });

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 3,
          },
          entity: { id: 1, attrBigIntegerUnique: 3 },
        })
      );

      expect(await validator(3)).toBe(3);
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 4,
          },
          entity: null,
        })
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
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 5,
          },
          entity: { id: 1, attrBigIntegerUnique: 42 },
        })
      );

      await validator(5);

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrBigIntegerUnique: 5 }, { $not: { id: 1 } }] },
      });
    });
  });
});
