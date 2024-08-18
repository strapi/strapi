import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';

import { Validators } from '../validators';
import { mockOptions } from './utils';

describe('UID validator', () => {
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
    globalId: 'test-model',
    modelName: 'test-model',
    uid: 'api::test.test-uid',
    info: {
      displayName: 'Test model',
      singularName: 'test-model',
      pluralName: 'test-models',
    },
    options: {},
    attributes: {
      attrUidUnique: { type: 'uid' },
    },
  };

  describe('unique', () => {
    describe('draft', () => {
      test('ignores unique validation', async () => {
        fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unique-uid' });
        const valueToCheck = 'non-unique-uid';

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
              entity: null,
            },
            mockOptions
          )
        );

        expect(await validator(valueToCheck)).toBe(valueToCheck);
      });
    });

    describe('published', () => {
      const options = { ...mockOptions, isDraft: false };

      test('it validates the unique constraint if there is no other record in the database', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
              entity: null,
            },
            options
          )
        );

        expect(await validator('non-unique-uid')).toBe('non-unique-uid');
        expect(fakeFindOne).toHaveBeenCalled();
      });

      test('it does not validates the unique constraint if the attribute value is `null`', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: null },
              entity: null,
            },
            options
          ).nullable()
        );

        await validator(null);

        expect(fakeFindOne).not.toHaveBeenCalled();
      });

      test('it always validates the unique constraint even if the attribute is not set as unique', async () => {
        fakeFindOne.mockResolvedValueOnce(null);
        const valueToCheck = 'non-unique-uid';

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
              entity: null,
            },
            options
          )
        );

        expect(await validator(valueToCheck)).toBe(valueToCheck);
        expect(fakeFindOne).toHaveBeenCalledWith({
          where: {
            locale: 'en',
            publishedAt: { $notNull: true },
            attrUidUnique: valueToCheck,
          },
          select: ['id'],
        });
      });

      test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
        expect.assertions(1);
        fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unique-uid' });

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
              entity: null,
            },
            options
          )
        );

        try {
          await validator('unique-uid');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      const valueToCheck = 'unique-uid';
      test('it checks the database for records with the same value for the checked attribute', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
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
            attrUidUnique: valueToCheck,
          },
          select: ['id'],
        });
      });

      test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
              entity: { id: 1, attrUidUnique: 'other-uid' },
            },
            options
          )
        );

        await validator(valueToCheck);

        expect(fakeFindOne).toHaveBeenCalledWith({
          where: {
            locale: 'en',
            id: { $ne: 1 },
            publishedAt: { $notNull: true },
            attrUidUnique: valueToCheck,
          },
          select: ['id'],
        });
      });
    });
  });

  describe('regExp', () => {
    const options = { ...mockOptions, isDraft: false };

    test('it fails to validate the uid if it does not fit the requried format', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        Validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          options
        )
      );

      try {
        await validator('wrongly\\formated||UID');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validate the uid if it fit the required format', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        Validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          options
        )
      );

      expect(await validator('properly.formated-uid')).toBe('properly.formated-uid');
    });
  });
});
