import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import validators from '../validators';

describe('Datetime validator', () => {
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
      attrDateTimeUnique: { type: 'datetime', unique: true },
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

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.datetime({
          attr: { type: 'datetime' },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: { id: 1, attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
        })
      );

      await validator('2021-11-29T00:00:00.000Z');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .datetime({
            attr: { type: 'datetime', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrDateTimeUnique', value: null },
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
        validators.datetime({
          attr: { type: 'datetime', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: null,
        })
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        validators.datetime({
          attr: { type: 'datetime', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: null,
        })
      );

      try {
        await validator('2021-11-29T00:00:00.000Z');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        validators.datetime({
          attr: { type: 'datetime', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: { id: 1, attrDateTimeUnique: '2021-11-29T00:00:00.000Z' },
        })
      );

      expect(await validator('2021-11-29T00:00:00.000Z')).toBe('2021-11-29T00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.datetime({
          attr: { type: 'datetime', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: null,
        })
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
        validators.datetime({
          attr: { type: 'datetime', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrDateTimeUnique', value: '2021-11-29T00:00:00.000Z' },
          entity: { id: 1, attrDateTimeUnique: '2021-12-25T00:00:00.000Z' },
        })
      );

      await validator('2021-11-29T00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrDateTimeUnique: '2021-11-29T00:00:00.000Z' }, { $not: { id: 1 } }] },
      });
    });
  });
});
