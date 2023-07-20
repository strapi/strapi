/* eslint-disable no-template-curly-in-string */
import * as yup from 'yup';
import _ from 'lodash';
import { defaults, isNumber, isInteger, get } from 'lodash/fp';
import * as utils from './string-formatting';
import { YupValidationError } from './errors';
import printValue from './print-value';

const MixedSchemaType = yup.MixedSchema;

const isNotNilTest = (value: unknown) => !_.isNil(value);

const isNotNullTest = (value: unknown) => !_.isNull(value);

yup.addMethod(yup.mixed, 'notNil', function isNotNill(msg = '${path} must be defined.') {
  return this.test('defined', msg, isNotNilTest);
});

yup.addMethod(yup.mixed, 'notNull', function isNotNull(msg = '${path} cannot be null.') {
  return this.test('defined', msg, isNotNullTest);
});

yup.addMethod(yup.mixed, 'isFunction', function isFunction(message = '${path} is not a function') {
  return this.test(
    'is a function',
    message,
    (value) => _.isUndefined(value) || _.isFunction(value)
  );
});

yup.addMethod(
  yup.string,
  'isCamelCase',
  function isCamelCase(message = '${path} is not in camel case (anExampleOfCamelCase)') {
    return this.test('is in camelCase', message, (value) =>
      value ? utils.isCamelCase(value) : true
    );
  }
);

yup.addMethod(
  yup.string,
  'isKebabCase',
  function isKebabCase(message = '${path} is not in kebab case (an-example-of-kebab-case)') {
    return this.test('is in kebab-case', message, (value) =>
      value ? utils.isKebabCase(value) : true
    );
  }
);

yup.addMethod(
  yup.object,
  'onlyContainsFunctions',
  function onlyContainsFunctions(message = '${path} contains values that are not functions') {
    return this.test(
      'only contains functions',
      message,
      (value) => _.isUndefined(value) || (value && Object.values(value).every(_.isFunction))
    );
  }
);

yup.addMethod(
  yup.array,
  'uniqueProperty',
  function uniqueProperty(propertyName: string, message: string) {
    return this.test('unique', message, function unique(list) {
      const errors: yup.ValidationError[] = [];

      list?.forEach((element, index) => {
        const sameElements = list.filter(
          (e) => get(propertyName, e) === get(propertyName, element)
        );
        if (sameElements.length > 1) {
          errors.push(
            this.createError({
              path: `${this.path}[${index}].${propertyName}`,
              message,
            })
          );
        }
      });

      if (errors.length) {
        throw new yup.ValidationError(errors);
      }
      return true;
    });
  }
);

class StrapiIDSchema extends MixedSchemaType {
  constructor() {
    super({ type: 'strapiID' });
  }

  _typeCheck(value: unknown): value is string | number {
    return typeof value === 'string' || (isNumber(value) && isInteger(value) && value >= 0);
  }
}

const handleYupError = (error: yup.ValidationError, errorMessage: string) => {
  throw new YupValidationError(error, errorMessage);
};

const defaultValidationParam = { strict: true, abortEarly: false };

const validateYupSchema =
  (schema: yup.AnySchema, options = {}) =>
  async (body: unknown, errorMessage: string) => {
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
  (body: unknown, errorMessage: string) => {
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

interface NoTypeOptions {
  path: string;
  type: string;
  value: unknown;
  originalValue: unknown;
}

// Temporary fix of this issue : https://github.com/jquense/yup/issues/616
yup.setLocale({
  mixed: {
    notType(options: NoTypeOptions) {
      const { path, type, value, originalValue } = options;
      const isCast = originalValue != null && originalValue !== value;
      const msg =
        `${path} must be a \`${type}\` type, ` +
        `but the final value was: \`${printValue(value, true)}\`${
          isCast ? ` (cast from the value \`${printValue(originalValue, true)}\`).` : '.'
        }`;

      /* Remove comment that is not supposed to be seen by the enduser
      if (value === null) {
        msg += `\n If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``;
      }
      */
      return msg;
    },
  },
});

const customYup = Object.assign(yup, {
  strapiID: (): InstanceType<typeof StrapiIDSchema> => new StrapiIDSchema(),
});

export {
  customYup as yup,
  StrapiIDSchema,
  handleYupError,
  validateYupSchema,
  validateYupSchemaSync,
};
