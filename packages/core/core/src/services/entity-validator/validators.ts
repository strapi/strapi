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
  locale: string;
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
  { isDraft }: ValidatorOptions
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
  { attr, model, updatedAttribute, entity }: ValidatorMetas<Attribute.Any & Attribute.UniqueOption>,
  options: ValidatorOptions
): T => {
  if (attr.type !== 'uid' && !attr.unique) {
    return validator;
  }

  return validator.test('unique', 'This attribute must be unique', async (value) => {
    const isPublish = options.isDraft === false;

    // When publishing, the value will not have changed so we take the value from the entity
    const valueToCheck = isPublish ? entity?.[updatedAttribute.name] : value;

    /**
     * If the attribute value is `null` we want to skip the unique validation.
     * Otherwise it'll only accept a single `null` entry in the database.
     */
    if (_.isNil(valueToCheck)) {
      return true;
    }

    /**
     * If we are updating a draft and the value is unchanged we skip the unique verification. This will
     * prevent the validator to be triggered in case the user activated the
     * unique constraint after already creating multiple entries with
     * the same attribute value for that field.
     */
    if (!isPublish && valueToCheck === entity?.[updatedAttribute.name]) {
      return true;
    }

    /**
     * At this point we know that we are creating a new entry, publishing an entry or that the unique field value has changed
     * We check if there is an entry of this content type in the same locale, publication state and with the same unique field value
     */

    const record = await strapi.documents(model.uid).findFirst({
      locale: options.locale,
      status: options.isDraft ? 'draft' : 'published',
      filters: {
        [updatedAttribute.name]: valueToCheck,
        ...(entity?.id ? { id: { $ne: entity.id } } : {}),
      },
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
  schema = addUniqueValidator(schema, metas, options);

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

const integerValidator = (
  metas: ValidatorMetas<Attribute.Integer | Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  let schema = yup.number().integer();

  schema = addMinIntegerValidator(schema, metas);
  schema = addMaxIntegerValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

const floatValidator = (
  metas: ValidatorMetas<Attribute.Decimal | Attribute.Float>,
  options: ValidatorOptions
) => {
  let schema = yup.number();
  schema = addMinFloatValidator(schema, metas);
  schema = addMaxFloatValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

const bigintegerValidator = (
  metas: ValidatorMetas<Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas, options);
};

const datesValidator = (
  metas: ValidatorMetas<Attribute.Date | Attribute.DateTime | Attribute.Time | Attribute.Timestamp>,
  options: ValidatorOptions
) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas, options);
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
