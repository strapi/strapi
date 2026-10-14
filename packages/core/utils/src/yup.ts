/* eslint-disable no-template-curly-in-string */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import * as yup from 'yup';
import _, { isNumber, get } from 'lodash';
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
          (e) => get(e, propertyName) === get(element, propertyName)
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

// yup 0.32.9's email regex backtracks exponentially on some short inputs, so one request can block
// the event loop. This is the same pattern with two changes:
// - `.` is no longer allowed inside a domain label, only between labels. Labels are still split on
//   `.`, so the only addresses this now rejects have an empty label, a label that starts or ends
//   with `-`, `_` or `~`, or a top-level label that starts with a digit.
// - the quoted local part matches its characters with one class instead of overlapping
//   alternatives, which the `i` flag made ambiguous for letters. It accepts exactly the same input.
const rEmail =
  // eslint-disable-next-line no-useless-escape, no-control-regex
  /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f\x21\x23-\x5b\x5d-\x7e\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;

yup.addMethod(
  yup.string,
  'email',
  function email(
    message: Parameters<yup.StringSchema['email']>[0] = '${path} must be a valid email'
  ) {
    return this.matches(rEmail, { name: 'email', message, excludeEmptyString: true });
  }
);

export class StrapiIDSchema extends yup.MixedSchema {
  constructor() {
    super({ type: 'strapiID' });
  }

  _typeCheck(value: unknown): value is string | number {
    return typeof value === 'string' || (isNumber(value) && Number.isInteger(value) && value >= 0);
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
