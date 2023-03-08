'use strict';

const strapiUtils = require('@strapi/utils');
const {
  errors: { YupValidationError },
} = require('@strapi/utils');
const validators = require('../validators');

describe('Email validator', () => {
  describe('email', () => {
    test('it fails the validation if the string is not a valid email', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.email(
          {
            attr: { type: 'email' },
          },
          { isDraft: false }
        )
      );

      try {
        await validator('invalid-email');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the email if it is valid', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.email(
          {
            attr: { type: 'email' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('valid@email.com')).toBe('valid@email.com');
    });

    test('it validates non-empty email required field', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.email({ attr: { type: 'email' } }, { isDraft: false })
      );

      try {
        await validator('');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
        expect(err.message).toBe('this cannot be empty');
      }
    });
  });
});
