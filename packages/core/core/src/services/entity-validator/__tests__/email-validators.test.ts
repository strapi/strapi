import strapiUtils, { errors } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import { Validators } from '../validators';

describe('Email validator', () => {
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
      attrEmail: { type: 'email' },
    },
  };

  describe('email', () => {
    describe('draft', () => {
      test('validation does not fail if the string is not a valid email', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: true }
          )
        );

        await validator('invalid-email');
      });

      test('validation does not fail if the string is empty', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: true }
          )
        );

        await validator('');
      });

      test('validation fails if not a valid string', async () => {
        expect.assertions(1);

        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: true }
          )
        );

        try {
          await validator(1);
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });
    });

    describe('published', () => {
      test('it fails the validation if the string is not a valid email', async () => {
        expect.assertions(1);

        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: false }
          )
        );

        try {
          await validator('invalid-email');
        } catch (err) {
          expect(err).toBeInstanceOf(errors.YupValidationError);
        }
      });

      test('it validates the email if it is valid', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: false }
          )
        );

        expect(await validator('valid@email.com')).toBe('valid@email.com');
      });

      test('it validates non-empty email required field', async () => {
        const validator = strapiUtils.validateYupSchema(
          Validators.email(
            {
              attr: { type: 'email' },
              model: fakeModel,
              updatedAttribute: { name: 'attrEmail', value: 1 },
              entity: null,
            },
            { isDraft: false }
          )
        );

        expect.hasAssertions();

        try {
          await validator('');
        } catch (err) {
          if (err instanceof Error) {
            expect(err).toBeInstanceOf(errors.YupValidationError);
            expect(err.message).toBe('this cannot be empty');
          }
        }
      });
    });
  });
});
