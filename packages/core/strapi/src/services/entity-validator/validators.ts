import _ from 'lodash';
import strapiUtils from '@strapi/utils';

import type { Attribute, Schema } from '../../types';

const { yup } = strapiUtils;

interface ValidatorMetas {
  attr: Attribute.Any;
  model: Schema.ContentType;
  updatedAttribute: { name: string; value: unknown };
  entity: Record<string, unknown>;
  isDraft: boolean;
}

interface ValidatorOptions {
  isDraft: boolean;
}

interface ValidatorFunc<T extends AllSchemas> {
  (validator: T, metas: ValidatorMetas, context: ValidatorOptions): AllSchemas;
}

type AllSchemas =
  | strapiUtils.yup.AnySchema
  | strapiUtils.yup.ArraySchema
  | strapiUtils.yup.ObjectSchema
  | strapiUtils.yup.NumberSchema
  | strapiUtils.yup.StringSchema
  | strapiUtils.yup.BooleanSchema;

function hasArgsWithValidator(args: unknown[]): args is ArgsWithValidator {
  return yup.isSchema(args[0]);
}

type ArgsWithValidator = [AllSchemas, ValidatorMetas, ValidatorOptions];
type ArgsWithoutValidator = [ValidatorMetas, ValidatorOptions];

/**
 * Utility function to compose validatorsd
 */
const composeValidators =
  <T extends AllSchemas>(...fns: ValidatorFunc<T>[]) =>
  (...args: ArgsWithValidator | ArgsWithoutValidator) => {
    let validator = yup.mixed();

    // if we receive a schema then use it as base schema for nested composition
    if (hasArgsWithValidator(args)) {
      validator = args[0];
      const [, metas, options] = args;
      return fns.reduce((validator, fn) => fn(validator, metas, options), validator);
    }

    return fns.reduce((validator, fn) => fn(validator, ...args), validator);
  };

/* Validator utils */

/**
 * Adds minLength validator
 */
const addMinLengthValidator = (
  validator: strapiUtils.yup.StringSchema,
  { attr }: { attr: Attribute.String | Attribute.Text | Attribute.RichText | Attribute.Password },
  { isDraft }: { isDraft: boolean }
) => (_.isInteger(attr.minLength) && !isDraft ? validator.min(attr.minLength) : validator);

/**
 * Adds maxLength validator
 * @returns {StringSchema}
 */
const addMaxLengthValidator = (
  validator: strapiUtils.yup.StringSchema,
  {
    attr,
  }: {
    attr: Attribute.String | Attribute.Text | Attribute.RichText | Attribute.Password;
  }
) => (_.isInteger(attr.maxLength) ? validator.max(attr.maxLength) : validator);

/**
 * Adds min integer validator
 * @returns {NumberSchema}
 */
const addMinIntegerValidator = (
  validator: strapiUtils.yup.NumberSchema | strapiUtils.yup.ArraySchema,
  { attr }: { attr: Attribute.MinMaxOption }
) => (_.isNumber(attr.min) ? validator.min(_.toInteger(attr.min)) : validator);

/**
 * Adds max integer validator
 */
const addMaxIntegerValidator = (
  validator: strapiUtils.yup.NumberSchema | strapiUtils.yup.ArraySchema,
  { attr }: { attr: Attribute.MinMaxOption }
) => (_.isNumber(attr.max) ? validator.max(_.toInteger(attr.max)) : validator);

/**
 * Adds min float/decimal validator
 */
const addMinFloatValidator = (
  validator: strapiUtils.yup.NumberSchema,
  { attr }: { attr: Attribute.MinMaxOption }
) => (_.isNumber(attr.min) ? validator.min(attr.min) : validator);

/**
 * Adds max float/decimal validator
 */
const addMaxFloatValidator = (
  validator: strapiUtils.yup.NumberSchema,
  { attr }: { attr: Attribute.MinMaxOption }
) => (_.isNumber(attr.max) ? validator.max(attr.max) : validator);

/**
 * Adds regex validator
 */
const addStringRegexValidator = (
  validator: strapiUtils.yup.StringSchema,
  { attr }: { attr: Attribute.String | Attribute.Text | Attribute.RichText | Attribute.Password }
) =>
  _.isUndefined(attr.regex)
    ? validator
    : validator.matches(new RegExp(attr.regex), { excludeEmptyString: !attr.required });

/**
 * Adds unique validator
 */
const addUniqueValidator = <T extends AllSchemas>(
  validator: T,
  {
    attr,
    model,
    updatedAttribute,
    entity,
  }: {
    attr: Attribute.Any;
    model: Schema.ContentType;
    updatedAttribute: { name: string; value: unknown };
    entity: Record<string, unknown>;
  }
) => {
  if (!attr.unique && attr.type !== 'uid') {
    return validator;
  }

  return validator.test('unique', 'This attribute must be unique', async (value) => {
    /**
     * If the attribute value is `null` we want to skip the unique validation.
     * Otherwise it'll only accept a single `null` entry in the database.
     */
    if (_.isNil(updatedAttribute.value)) {
      return true;
    }

    /**
     * If the attribute is unchanged we skip the unique verification. This will
     * prevent the validator to be triggered in case the user activated the
     * unique constraint after already creating multiple entries with
     * the same attribute value for that field.
     */
    if (entity && updatedAttribute.value === entity[updatedAttribute.name]) {
      return true;
    }

    const whereParams = entity
      ? { $and: [{ [updatedAttribute.name]: value }, { $not: { id: entity.id } }] }
      : { [updatedAttribute.name]: value };

    const record = await strapi.db.query(model.uid).findOne({
      select: ['id'],
      where: whereParams,
    });

    return !record;
  });
};

/* Type validators */

const stringValidator = composeValidators(
  () => yup.string().transform((val, originalVal) => originalVal),
  addMinLengthValidator,
  addMaxLengthValidator,
  addStringRegexValidator,
  addUniqueValidator
);

const emailValidator = composeValidators(
  stringValidator,
  (validator: strapiUtils.yup.StringSchema) => validator.email().min(1, '${path} cannot be empty')
);

const uidValidator = composeValidators(stringValidator, (validator: strapiUtils.yup.StringSchema) =>
  validator.matches(/^[A-Za-z0-9-_.~]*$/)
);

const enumerationValidator = ({ attr }: { attr: Attribute.Enumeration }) => {
  return yup.string().oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null));
};

const integerValidator = composeValidators(
  () => yup.number().integer(),
  addMinIntegerValidator,
  addMaxIntegerValidator,
  addUniqueValidator
);

const floatValidator = composeValidators(
  () => yup.number(),
  addMinFloatValidator,
  addMaxFloatValidator,
  addUniqueValidator
);

export default {
  string: stringValidator,
  text: stringValidator,
  richtext: stringValidator,
  password: stringValidator,
  email: emailValidator,
  enumeration: enumerationValidator,
  boolean: () => yup.boolean(),
  uid: uidValidator,
  json: () => yup.mixed(),
  integer: integerValidator,
  biginteger: composeValidators(addUniqueValidator),
  float: floatValidator,
  decimal: floatValidator,
  date: composeValidators(addUniqueValidator),
  time: composeValidators(addUniqueValidator),
  datetime: composeValidators(addUniqueValidator),
  timestamp: composeValidators(addUniqueValidator),
};
