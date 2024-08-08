import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';

import { Validators } from '../validators';
import { mockOptions } from './utils';

describe('Time validator', () => {
  describe('unique', () => {
    const fakeFindOne = jest.fn();

    global.strapi = {
      db: {
        query: () => ({
          findOne: fakeFindOne,
        }),
      },
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

    describe('draft', () => {
      const options = { ...mockOptions, isDraft: true };

      test('it ignores the unique validation ', async () => {
        fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: '1638140400',
              },
              entity: null,
            },
            options
          )
        );

        expect(await validator('1638140400')).toBe('1638140400');
      });
    });

    describe('published', () => {
      const options = { ...mockOptions, isDraft: false };

      test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp' },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: '1638140400',
              },
              entity: null,
            },
            options
          )
        );

        await validator('1638140400');

        expect(fakeFindOne).not.toHaveBeenCalled();
      });

      test('it does not validates the unique constraint if the attribute value is `null`', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: null,
              },
              entity: null,
            },
            options
          ).nullable()
        );

        await validator(null);
        expect(fakeFindOne).not.toHaveBeenCalled();
      });

      test('it validates the unique constraint if there is no other record in the database', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: '1638140400',
              },
              entity: null,
            },
            options
          )
        );

        expect(await validator('1638140400')).toBe('1638140400');
      });

      test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
        expect.assertions(1);
        fakeFindOne.mockResolvedValueOnce({ attrTimestampUnique: '1638140400' });

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: '1638140400',
              },
              entity: null,
            },
            options
          )
        );

        try {
          await validator('1638140400');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      const valueToCheck = '1638140400';
      test('it checks the database for records with the same value for the checked attribute', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: valueToCheck,
              },
              entity: null,
            },
            options
          )
        );

        await validator(valueToCheck);

        expect(fakeFindOne).toHaveBeenCalledWith({
          where: {
            locale: 'en',
            publishedAt: { $notNull: true },
            attrTimestampUnique: valueToCheck,
          },
          select: ['id'],
        });
      });

      test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.timestamp(
            {
              attr: { type: 'timestamp', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrTimestampUnique',
                value: valueToCheck,
              },
              entity: { id: 1, attrTimestampUnique: '1000000000' },
            },
            options
          )
        );

        await validator(valueToCheck);

        expect(fakeFindOne).toHaveBeenCalledWith({
          where: {
            attrTimestampUnique: valueToCheck,
            id: {
              $ne: 1,
            },
            locale: 'en',
            publishedAt: { $notNull: true },
          },
          select: ['id'],
        });
      });
    });
  });
});
