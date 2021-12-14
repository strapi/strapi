'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils/lib/errors');
const validators = require('../validators');

describe('Email validator', () => {
  describe('email', () => {
    test('it fails the validation if the string is not a valid email', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.email(
          {
            attr: { type: 'string' },
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
            attr: { type: 'string' },
          },
          { isDraft: false }
        )
      );

      expect(await validator('valid@email.com')).toBe('valid@email.com');
    });
  });
});
