import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';

import validators from '../validators';
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
    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          mockOptions
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
      expect(fakeFindOne).toHaveBeenCalled();
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .uid(
            {
              attr: { type: 'uid' },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: null },
              entity: null,
            },
            mockOptions
          )
          .nullable()
      );

      await validator(null);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test.only('it always validates the unique constraint even if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);
      const valueToCheck = 'non-unique-uid';

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
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
      expect(fakeFindOne).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          publishedAt: null,
          attrUidUnique: valueToCheck,
        },
      });
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: null,
          },
          mockOptions
        )
      );

      try {
        await validator('unique-uid');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unchanged-unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unchanged-unique-uid' },
            entity: { id: 1, attrUidUnique: 'unchanged-unique-uid' },
          },
          mockOptions
        )
      );

      expect(await validator('unchanged-unique-uid')).toBe('unchanged-unique-uid');
    });

    const valueToCheck = 'unique-uid';
    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
            entity: null,
          },
          mockOptions
        )
      );

      await validator(valueToCheck);

      expect(fakeFindOne).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          publishedAt: null,
          attrUidUnique: valueToCheck,
        },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: valueToCheck },
            entity: { id: 1, attrUidUnique: 'other-uid' },
          },
          mockOptions
        )
      );

      await validator(valueToCheck);

      expect(fakeFindOne).toHaveBeenCalledWith({
        where: {
          locale: 'en',
          publishedAt: null,
          attrUidUnique: valueToCheck,
        },
      });
    });
  });

  describe('regExp', () => {
    test('it fails to validate the uid if it does not fit the requried format', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          mockOptions
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
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          mockOptions
        )
      );

      expect(await validator('properly.formated-uid')).toBe('properly.formated-uid');
    });
  });
});
