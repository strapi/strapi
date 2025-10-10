import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import { Validators } from '../validators';
import { mockOptions } from './utils';

describe('String validator', () => {
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
      attrStringUnique: { type: 'string', unique: true },
    },
  };

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

    describe('draft', () => {
      const options = { ...mockOptions, isDraft: true };

      test('it does not validate unique constraints', async () => {
        fakeFindOne.mockResolvedValueOnce({ attrStringUnique: 'test-data' });

        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'non-unique-test-data',
              },
              entity: null,
            },
            options
          )
        );

        expect(await validator('non-unique-test-data')).toBe('non-unique-test-data');
      });
    });

    describe('published', () => {
      const options = { ...mockOptions, isDraft: false };

      test('it does not validates the unique constraint if the attribute is not set as unique', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string' },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'non-unique-test-data',
              },
              entity: null,
            },
            options
          )
        );

        await validator('non-unique-test-data');

        expect(fakeFindOne).not.toHaveBeenCalled();
      });

      test('it does not validates the unique constraint if the attribute value is `null`', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
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
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'non-unique-test-data',
              },
              entity: null,
            },
            options
          )
        );

        expect(await validator('non-unique-test-data')).toBe('non-unique-test-data');
      });

      test('it fails the validation of the unique constraint if the database contains a record with the same attribute value', async () => {
        expect.assertions(1);
        fakeFindOne.mockResolvedValueOnce({ attrStringUnique: 'unique-test-data' });

        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'unique-test-data',
              },
              entity: null,
            },
            options
          )
        );

        try {
          await validator('unique-test-data');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      test('it checks the database for records with the same value for the checked attribute', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const valueToCheck = 'test-data';
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
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
            attrStringUnique: valueToCheck,
            publishedAt: { $notNull: true },
          },
          select: ['id'],
        });
      });

      test('it checks the database for records with the same value but not the same id for the checked attribute if an entity is passed', async () => {
        fakeFindOne.mockResolvedValueOnce(null);

        const valueToCheck = 'test-data';
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', unique: true },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: valueToCheck,
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        await validator(valueToCheck);

        expect(fakeFindOne).toHaveBeenCalledWith({
          where: {
            attrStringUnique: valueToCheck,
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

  describe('minLength', () => {
    describe('draft', () => {
      const options = { ...mockOptions, isDraft: true };

      test('ignores the minLength constraint', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', minLength: 3 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'a',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        expect(await validator('a')).toBe('a');
      });
    });

    describe('published', () => {
      const options = { ...mockOptions, isDraft: false };

      test('it fails the validation if the string is shorter than the define minLength', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', minLength: 3 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'test-data',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        try {
          await validator('a');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      test('it validates the minLength constraint if the string is longer than the define minLength', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', minLength: 3 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'test-data',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        expect(await validator('this string is longer than the minLenght')).toBe(
          'this string is longer than the minLenght'
        );
      });
    });
  });

  describe.each([{ isDraft: true }, { isDraft: false }])(
    'maxLength - $isDraft',
    ({ isDraft }: { isDraft: boolean }) => {
      const options = { ...mockOptions, isDraft };

      test('it does not validates the maxLength constraint if the attribute maxLength is not an integer', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', maxLength: 123 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'test-data',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        expect(await validator('a')).toBe('a');
      });

      test('it fails the validation if the string is longer than the define maxLength', async () => {
        expect.assertions(1);

        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', maxLength: 3 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'test-data',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        try {
          await validator('this string is too long');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      test('it validates the maxLength constraint if the string is shorter than the define maxLength', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.string(
            {
              attr: { type: 'string', maxLength: 3 },
              model: fakeModel,
              updatedAttribute: {
                name: 'attrStringUnique',
                value: 'test-data',
              },
              entity: { id: 1, attrStringUnique: 'other-data' },
            },
            options
          )
        );

        expect(await validator('a')).toBe('a');
      });
    }
  );

  describe('regExp', () => {
    const options = { ...mockOptions, isDraft: false };

    test('it fails the validation of an empty string for a required field', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        Validators.string(
          {
            attr: { type: 'string', required: true, regex: /^\w+$/ },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: { id: 1, attrStringUnique: 'other-data' },
          },
          options
        )
      );

      try {
        await validator('');
      } catch (err) {
        expect(err).toBeInstanceOf(errors.YupValidationError);
      }
    });

    test('it validates a string for required field according to the regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.string(
          {
            attr: { type: 'string', required: true, regex: /^\w+$/ },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: { id: 1, attrStringUnique: 'other-data' },
          },
          options
        )
      );

      expect(await validator('Strapi')).toBe('Strapi');
    });

    test('it validates an empty string for non-required field with a regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.string(
          {
            attr: { type: 'string', required: false, regex: /^\w+$/ },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: { id: 1, attrStringUnique: 'other-data' },
          },
          options
        )
      );

      expect(await validator('')).toBe('');
    });

    test('it validates a string for non-required field according to the regex constraint', async () => {
      const validator = strapiUtils.validateYupSchema(
        Validators.string(
          {
            attr: { type: 'string', required: false, regex: /^\w+$/ },
            model: fakeModel,
            updatedAttribute: {
              name: 'attrStringUnique',
              value: 'test-data',
            },
            entity: { id: 1, attrStringUnique: 'other-data' },
          },
          options
        )
      );

      expect(await validator('Strapi')).toBe('Strapi');
    });
  });
});
