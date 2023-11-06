/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable no-template-curly-in-string */
import * as yup from 'yup';
import { defaults } from 'lodash/fp';
import { YupValidationError } from './errors';

const handleYupError = (error: yup.ValidationError, errorMessage?: string) => {
  throw new YupValidationError(error, errorMessage);
};

const defaultValidationParam = { strict: true, abortEarly: false };

const validateYupSchema =
  (schema: yup.AnySchema, options = {}) =>
  async (body: unknown, errorMessage?: string) => {
    try {
      const optionsWithDefaults = defaults(defaultValidationParam, options);
      const result = await schema.validate(body, optionsWithDefaults);
      return result;
    } catch (e) {
      if (e instanceof yup.ValidationError) {
        handleYupError(e, errorMessage);
      }

      throw e;
    }
  };

const validateYupSchemaSync =
  (schema: yup.AnySchema, options = {}) =>
  (body: unknown, errorMessage?: string) => {
    try {
      const optionsWithDefaults = defaults(defaultValidationParam, options);
      return schema.validateSync(body, optionsWithDefaults);
    } catch (e) {
      if (e instanceof yup.ValidationError) {
        handleYupError(e, errorMessage);
      }

      throw e;
    }
  };

export { handleYupError, validateYupSchema, validateYupSchemaSync };
