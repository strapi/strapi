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
    const fakeFindFirst = jest.fn();

    global.strapi = {
      documents: {
        findFirst: fakeFindFirst,
      },
    } as any;

    afterEach(() => {
      jest.clearAllMocks();
      fakeFindFirst.mockReset();
    });

    test('it does not validate the unique constraint if the attribute is not set as unique', async () => {
      fakeFindFirst.mockResolvedValueOnce(null);

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

      expect(fakeFindFirst).not.toHaveBeenCalled();
    });

    test('it does not validate the unique constraint if the attribute value is `null`', async () => {
      fakeFindFirst.mockResolvedValueOnce(null);

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

      expect(fakeFindFirst).not.toHaveBeenCalled();
    });

    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindFirst.mockResolvedValueOnce(null);

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
      fakeFindFirst.mockResolvedValueOnce({ attrBigIntegerUnique: 2 });

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
      fakeFindFirst.mockResolvedValueOnce({ attrBigIntegerUnique: 3 });

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
      fakeFindFirst.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 4,
          },
          entity: null,
          locale: 'en',
        })
      );

      await validator(4);

      expect(fakeFindFirst).toHaveBeenCalledWith(fakeModel.uid, {
        filters: { attrBigIntegerUnique: 4, locale: 'en' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindFirst.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.biginteger({
          attr: { type: 'biginteger', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrBigIntegerUnique',
            value: 5,
          },
          entity: { id: 1, attrBigIntegerUnique: 42 },
          locale: 'en',
        })
      );

      await validator(5);

      expect(fakeFindFirst).toHaveBeenCalledWith(fakeModel.uid, {
        filters: { attrBigIntegerUnique: 5, locale: 'en' },
      });
    });
  });
});
