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
        attrTimestampUnique: { type: 'timestamp', unique: true },
      },
    };

    test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.timestamp({
          attr: { type: 'timestamp' },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: null,
        })
      );

      await validator('1638140400');

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .timestamp({
            attr: { type: 'timestamp', unique: true },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrTimestampUnique',
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
        validators.timestamp({
          attr: { type: 'timestamp', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: null,
        })
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

      const validator = strapiUtils.validateYupSchema(
        validators.timestamp({
          attr: { type: 'timestamp', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: null,
        })
      );

      try {
        await validator('1638140400');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

      const validator = strapiUtils.validateYupSchema(
        validators.timestamp({
          attr: { type: 'timestamp', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: { id: 1, attrTimestampUnique: '1638140400' },
        })
      );

      expect(await validator('1638140400')).toBe('1638140400');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.timestamp({
          attr: { type: 'timestamp', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: null,
        })
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
        validators.timestamp({
          attr: { type: 'timestamp', unique: true },
          model: fakeModel,
          updatedAttribute: {
            name: 'attrTimestampUnique',
            value: '1638140400',
          },
          entity: { id: 1, attrTimestampUnique: '1000000000' },
        })
      );

      await validator('1638140400');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrTimestampUnique: '1638140400' }, { $not: { id: 1 } }] },
      });
    });
  });
});
