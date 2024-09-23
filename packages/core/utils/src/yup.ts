/* eslint-disable no-template-curly-in-string */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as yup from 'yup';
import _ from 'lodash';
import { isNumber, isInteger, get } from 'lodash/fp';
import { strings } from './primitives';
import { printValue } from './print-value';

export * from 'yup';

export const strapiID = (): InstanceType<typeof StrapiIDSchema> => new StrapiIDSchema();

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
      value ? strings.isCamelCase(value) : true
    );
  }
);

yup.addMethod(
  yup.string,
  'isKebabCase',
  function isKebabCase(message = '${path} is not in kebab case (an-example-of-kebab-case)') {
    return this.test('is in kebab-case', message, (value) =>
      value ? strings.isKebabCase(value) : true
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

export class StrapiIDSchema extends yup.MixedSchema {
  constructor() {
    super({ type: 'strapiID' });
  }

  _typeCheck(value: unknown): value is string | number {
    return typeof value === 'string' || (isNumber(value) && isInteger(value) && value >= 0);
  }
}

declare module 'yup' {
  // const strapiID: () => InstanceType<typeof StrapiIDSchema>;

  export interface BaseSchema {
    isFunction(message?: string): this;
    notNil(message?: string): this;
    notNull(message?: string): this;
  }

  export interface StringSchema {
    isCamelCase(message?: string): this;
    isKebabCase(message?: string): this;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  export interface ObjectSchema<TShape> {
    onlyContainsFunctions(message?: string): this;
  }
}

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
