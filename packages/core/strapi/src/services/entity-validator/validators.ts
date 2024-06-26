import _ from 'lodash';
import strapiUtils from '@strapi/utils';
import type { Attribute, Schema } from '@strapi/types';
import blocksValidator from './blocks-validator';

const { yup } = strapiUtils;

interface ValidatorMetas<TAttribute extends Attribute.Any> {
  attr: TAttribute;
  model: Schema.ContentType;
  updatedAttribute: { name: string; value: unknown };
  entity: Record<string, unknown> | null;
}

interface ValidatorOptions {
  isDraft: boolean;
}

/* Validator utils */

/**
 * Adds minLength validator
 */
const addMinLengthValidator = (
  validator: strapiUtils.yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Attribute.String
      | Attribute.Text
      | Attribute.RichText
      | Attribute.Password
      | Attribute.Email
      | Attribute.UID;
  },
  { isDraft }: { isDraft: boolean }
) => {
  return attr.minLength && _.isInteger(attr.minLength) && !isDraft
    ? validator.min(attr.minLength)
    : validator;
};

/**
 * Adds maxLength validator
 * @returns {StringSchema}
 */
const addMaxLengthValidator = (
  validator: strapiUtils.yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Attribute.String
      | Attribute.Text
      | Attribute.RichText
      | Attribute.Password
      | Attribute.Email
      | Attribute.UID;
  }
) => {
  return attr.maxLength && _.isInteger(attr.maxLength) ? validator.max(attr.maxLength) : validator;
};

/**
 * Adds min integer validator
 * @returns {NumberSchema}
 */
const addMinIntegerValidator = (
  validator: strapiUtils.yup.NumberSchema,
  {
    attr,
  }: {
    attr: Attribute.Integer | Attribute.BigInteger;
  }
) => (_.isNumber(attr.min) ? validator.min(_.toInteger(attr.min)) : validator);

/**
 * Adds max integer validator
 */
const addMaxIntegerValidator = (
  validator: strapiUtils.yup.NumberSchema,
  {
    attr,
  }: {
    attr: Attribute.Integer | Attribute.BigInteger;
  }
) => (_.isNumber(attr.max) ? validator.max(_.toInteger(attr.max)) : validator);

/**
 * Adds min float/decimal validator
 */
const addMinFloatValidator = (
  validator: strapiUtils.yup.NumberSchema,
  {
    attr,
  }: {
    attr: Attribute.Decimal | Attribute.Float;
  }
) => (_.isNumber(attr.min) ? validator.min(attr.min) : validator);

/**
 * Adds max float/decimal validator
 */
const addMaxFloatValidator = (
  validator: strapiUtils.yup.NumberSchema,
  {
    attr,
  }: {
    attr: Attribute.Decimal | Attribute.Float;
  }
) => (_.isNumber(attr.max) ? validator.max(attr.max) : validator);

/**
 * Adds regex validator
 */
const addStringRegexValidator = (
  validator: strapiUtils.yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Attribute.String
      | Attribute.Text
      | Attribute.RichText
      | Attribute.Password
      | Attribute.Email
      | Attribute.UID;
  }
) => {
  return 'regex' in attr && !_.isUndefined(attr.regex)
    ? validator.matches(new RegExp(attr.regex), { excludeEmptyString: !attr.required })
    : validator;
};

/**
 * Adds unique validator
 */
const addUniqueValidator = <T extends strapiUtils.yup.AnySchema>(
  validator: T,
  { attr, model, updatedAttribute, entity }: ValidatorMetas<Attribute.Any & Attribute.UniqueOption>
): T => {
  if (attr.type !== 'uid' && !attr.unique) {
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

    const record = await strapi.query(model.uid).findOne({
      select: ['id'],
      where: whereParams,
    });

    return !record;
  });
};

/* Type validators */

const stringValidator = (
  metas: ValidatorMetas<
    | Attribute.String
    | Attribute.Text
    | Attribute.RichText
    | Attribute.Password
    | Attribute.Email
    | Attribute.UID
  >,
  options: ValidatorOptions
) => {
  let schema = yup.string().transform((val, originalVal) => originalVal);

  schema = addMinLengthValidator(schema, metas, options);
  schema = addMaxLengthValidator(schema, metas);
  schema = addStringRegexValidator(schema, metas);
  schema = addUniqueValidator(schema, metas);

  return schema;
};

const emailValidator = (metas: ValidatorMetas<Attribute.Email>, options: ValidatorOptions) => {
  const schema = stringValidator(metas, options);
  return schema.email().min(1, '${path} cannot be empty');
};

const uidValidator = (metas: ValidatorMetas<Attribute.UID>, options: ValidatorOptions) => {
  const schema = stringValidator(metas, options);

  return schema.matches(/^[A-Za-z0-9-_.~]*$/);
};

const enumerationValidator = ({ attr }: { attr: Attribute.Enumeration }) => {
  return yup
    .string()
    .oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null as any));
};

const integerValidator = (metas: ValidatorMetas<Attribute.Integer | Attribute.BigInteger>) => {
  let schema = yup.number().integer();

  schema = addMinIntegerValidator(schema, metas);
  schema = addMaxIntegerValidator(schema, metas);
  schema = addUniqueValidator(schema, metas);

  return schema;
};

const floatValidator = (metas: ValidatorMetas<Attribute.Decimal | Attribute.Float>) => {
  let schema = yup.number();
  schema = addMinFloatValidator(schema, metas);
  schema = addMaxFloatValidator(schema, metas);
  schema = addUniqueValidator(schema, metas);

  return schema;
};

const bigintegerValidator = (metas: ValidatorMetas<Attribute.BigInteger>) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas);
};

const datesValidator = (
  metas: ValidatorMetas<Attribute.Date | Attribute.DateTime | Attribute.Time | Attribute.Timestamp>
) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas);
};

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
  biginteger: bigintegerValidator,
  float: floatValidator,
  decimal: floatValidator,
  date: datesValidator,
  time: datesValidator,
  datetime: datesValidator,
  timestamp: datesValidator,
  blocks: blocksValidator,
};
