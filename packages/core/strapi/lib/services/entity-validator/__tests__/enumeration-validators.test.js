'use strict';

const strapiUtils = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils/lib/errors');
const validators = require('../validators');

describe('Enumeration validator', () => {
  describe('oneOf', () => {
    test('it fails the validation if the value is not part of the allowed values', async () => {
      expect.assertions(1);

      const validator = strapiUtils.validateYupSchema(
        validators.enumeration(
          {
            attr: { type: 'enum', enum: ['strapi', 'headless'] },
          },
          { isDraft: false }
        )
      );

      try {
        await validator('invalid-value');
      } catch (err) {
        expect(err).toBeInstanceOf(YupValidationError);
      }
    });

    test('it validates the value if it is part of the allowed values', async () => {
      const validator = strapiUtils.validateYupSchema(
        validators.enumeration(
          {
            attr: { type: 'enumeration', enum: ['strapi', 'headless'] },
          },
          { isDraft: false }
        )
      );

      expect(await validator('strapi')).toBe('strapi');
    });
  });
});
