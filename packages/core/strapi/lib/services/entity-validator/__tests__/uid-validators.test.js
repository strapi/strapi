'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils/lib/errors');
const validators = require('../validators');

describe('UID validator', () => {
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
      attrUidUnique: { type: 'uid' },
    },
  };

  describe('unique', () => {
    test('it validates the unique constraint if there is no other record in the database', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
    });

    test('it does not validates the unique constraint if the attribute value is `null`', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators
          .uid(
            {
              attr: { type: 'uid', unique: true },
              model: fakeModel,
              updatedAttribute: { name: 'attrUidUnique', value: null },
              entity: null,
            },
            { isDraft: false }
          )
          .nullable()
      );

      await validator(null);

      expect(fakeFindOne).not.toHaveBeenCalled();
    });

    test('it always validates the unique constraint even if the attribute is not set as unique', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid' },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('non-unique-uid')).toBe('non-unique-uid');
      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrUidUnique: 'non-unique-uid' },
      });
    });

    test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
      expect.assertions(1);
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('unique-uid');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the unique constraint if the attribute data has not changed even if there is a record in the database with the same attribute value', async () => {
      fakeFindOne.mockResolvedValueOnce({ attrUidUnique: 'unchanged-unique-uid' });

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unchanged-unique-uid' },
            entity: { id: 1, attrUidUnique: 'unchanged-unique-uid' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('unchanged-unique-uid')).toBe('unchanged-unique-uid');
    });

    test('it checks the database for records with the same value for the checked attribute', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      await validator('unique-uid');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { attrUidUnique: 'unique-uid' },
      });
    });

    test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'unique-uid' },
            entity: { id: 1, attrUidUnique: 'other-uid' },
          },
          { isDraft: false }
        )
      );

      await validator('unique-uid');

      expect(fakeFindOne).toHaveBeenCalledWith({
        select: ['id'],
        where: { $and: [{ attrUidUnique: 'unique-uid' }, { $not: { id: 1 } }] },
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
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      try {
        await validator('wrongly\\formated||UID');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validate the uid if it fit the required format', async () => {
      fakeFindOne.mockResolvedValueOnce(null);

      const validator = strapiUtils.validateYupSchema(
        validators.uid(
          {
            attr: { type: 'uid', unique: true },
            model: fakeModel,
            updatedAttribute: { name: 'attrUidUnique', value: 'non-unique-uid' },
            entity: null,
          },
          { isDraft: false }
        )
      );

      expect(await validator('properly.formated-uid')).toBe('properly.formated-uid');
    });
  });
});
