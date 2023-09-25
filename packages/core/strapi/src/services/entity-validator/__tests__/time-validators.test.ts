import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import validators from '../validators';

describe('Time validator', () => {
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
        attrTimeUnique: { type: 'time', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.time({
          attr: { type: 'time' },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: null,
        })
      );

      await validator('00:00:00.000Z');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .time({
            attr: { type: 'time', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrTimeUnique', value: null },
            entity: { id: 1, attrTimeUnique: '00:00:00.000Z' },
          })
          .nullable()
      );

      await validator(null);
      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.time({
          attr: { type: 'time', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: null,
        })
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimeUnique: '00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        validators.time({
          attr: { type: 'time', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: null,
        })
      );

      try {
        await validator('00:00:00.000Z');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrTimeUnique: '00:00:00.000Z' });

      const validator = strapiUtils.validateYupSchema(
        validators.time({
          attr: { type: 'time', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: { id: 1, attrTimeUnique: '00:00:00.000Z' },
        })
      );

      expect(await validator('00:00:00.000Z')).toBe('00:00:00.000Z');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.time({
          attr: { type: 'time', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: null,
        })
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
        validators.time({
          attr: { type: 'time', unique: true },
          model: fakeModel,
          updatedAttribute: { name: 'attrTimeUnique', value: '00:00:00.000Z' },
          entity: { id: 1, attrTimeUnique: '01:00:00.000Z' },
        })
      );

      await validator('00:00:00.000Z');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrTimeUnique: '00:00:00.000Z' }, { $not: { id: 1 } }] },
      });
    });
  });
});
