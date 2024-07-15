import _ from 'lodash';
import { yup } from '@strapi/utils';
import type { Schema, Struct, Modules } from '@strapi/types';
import blocksValidator from './blocks-validator';

import type { ComponentContext } from '.';

interface ValidatorMetas<TAttribute extends Schema.Attribute.AnyAttribute> {
  attr: TAttribute;
  model: Struct.ContentTypeSchema;
  updatedAttribute: { name: string; value: unknown };
  entity: Modules.EntityValidator.Entity;
  componentContext: ComponentContext;
}

interface ValidatorOptions {
  isDraft: boolean;
  locale?: string;
}

/* Validator utils */

/**
 * Adds minLength validator
 */
const addMinLengthValidator = (
  validator: yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Schema.Attribute.String
      | Schema.Attribute.Text
      | Schema.Attribute.RichText
      | Schema.Attribute.Password
      | Schema.Attribute.Email
      | Schema.Attribute.UID;
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
  validator: yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Schema.Attribute.String
      | Schema.Attribute.Text
      | Schema.Attribute.RichText
      | Schema.Attribute.Password
      | Schema.Attribute.Email
      | Schema.Attribute.UID;
  }
) => {
  return attr.maxLength && _.isInteger(attr.maxLength) ? validator.max(attr.maxLength) : validator;
};

/**
 * Adds min integer validator
 * @returns {NumberSchema}
 */
const addMinIntegerValidator = (
  validator: yup.NumberSchema,
  {
    attr,
  }: {
    attr: Schema.Attribute.Integer | Schema.Attribute.BigInteger;
  }
) => (_.isNumber(attr.min) ? validator.min(_.toInteger(attr.min)) : validator);

/**
 * Adds max integer validator
 */
const addMaxIntegerValidator = (
  validator: yup.NumberSchema,
  {
    attr,
  }: {
    attr: Schema.Attribute.Integer | Schema.Attribute.BigInteger;
  }
) => (_.isNumber(attr.max) ? validator.max(_.toInteger(attr.max)) : validator);

/**
 * Adds min float/decimal validator
 */
const addMinFloatValidator = (
  validator: yup.NumberSchema,
  {
    attr,
  }: {
    attr: Schema.Attribute.Decimal | Schema.Attribute.Float;
  }
) => (_.isNumber(attr.min) ? validator.min(attr.min) : validator);

/**
 * Adds max float/decimal validator
 */
const addMaxFloatValidator = (
  validator: yup.NumberSchema,
  {
    attr,
  }: {
    attr: Schema.Attribute.Decimal | Schema.Attribute.Float;
  }
) => (_.isNumber(attr.max) ? validator.max(attr.max) : validator);

/**
 * Adds regex validator
 */
const addStringRegexValidator = (
  validator: yup.StringSchema,
  {
    attr,
  }: {
    attr:
      | Schema.Attribute.String
      | Schema.Attribute.Text
      | Schema.Attribute.RichText
      | Schema.Attribute.Password
      | Schema.Attribute.Email
      | Schema.Attribute.UID;
  }
) => {
  return 'regex' in attr && !_.isUndefined(attr.regex)
    ? validator.matches(new RegExp(attr.regex), { excludeEmptyString: !attr.required })
    : validator;
};

/**
 * Adds unique validator
 */
const addUniqueValidator = <T extends yup.AnySchema>(
  validator: T,
  {
    attr,
    model,
    updatedAttribute,
    entity,
    componentContext,
  }: ValidatorMetas<Schema.Attribute.AnyAttribute & Schema.Attribute.UniqueOption>,
  options: ValidatorOptions
): T => {
  if (attr.type !== 'uid' && !attr.unique) {
    return validator;
  }

  return validator.test('unique', 'This attribute must be unique', async (value) => {
    const isPublish = options.isDraft === false;

    /**
     * If the attribute value is `null` we want to skip the unique validation.
     * Otherwise it'll only accept a single `null` entry in the database.
     */
    if (_.isNil(value)) {
      return true;
    }

    /**
     * If we are updating a draft and the value is unchanged we skip the unique verification. This will
     * prevent the validator to be triggered in case the user activated the
     * unique constraint after already creating multiple entries with
     * the same attribute value for that field.
     */
    if (!isPublish && value === entity?.[updatedAttribute.name]) {
      return true;
    }

    let queryUid: string;
    let queryWhere: Record<string, any> = {};

    const hasPathToComponent = componentContext?.pathToComponent?.length > 0;
    if (hasPathToComponent) {
      const hasRepeatableData = componentContext.repeatableData.length > 0;
      if (hasRepeatableData) {
        // If we are validating a unique field within a repeatable component,
        // we first need to ensure that the repeatable in the current entity is
        // valid against itself.

        const { name: updatedName, value: updatedValue } = updatedAttribute;
        // Construct the full path to the unique field within the component.
        const pathToCheck = [...componentContext.pathToComponent.slice(1), updatedName].join('.');

        // Extract the values from the repeatable data using the constructed path
        const values = componentContext.repeatableData.map((item) => {
          return pathToCheck.split('.').reduce((acc, key) => acc[key], item as any);
        });

        // Check if the value is repeated in the current entity
        const isUpdatedAttributeRepeatedInThisEntity =
          values.filter((value) => value === updatedValue).length > 1;

        if (isUpdatedAttributeRepeatedInThisEntity) {
          return false;
        }
      }

      /**
       * When `componentContext` is present it means we are dealing with a unique
       * field within a component.
       *
       * The unique validation must consider the specific context of the
       * component, which will always be contained within a parent content type
       * and may also be nested within another component.
       *
       * We construct a query that takes into account the parent's model UID,
       * dimensions (such as draft and publish state/locale) and excludes the current
       * content type entity by its ID if provided.
       */
      const {
        model: parentModel,
        options: parentOptions,
        id: excludeId,
      } = componentContext.parentContent;
      queryUid = parentModel.uid;

      const whereConditions: Record<string, any> = {};
      const isParentDraft = parentOptions && parentOptions.isDraft;

      whereConditions.publishedAt = isParentDraft ? null : { $notNull: true };

      if (parentOptions?.locale) {
        whereConditions.locale = parentOptions.locale;
      }

      if (excludeId && !Number.isNaN(excludeId)) {
        whereConditions.id = { $ne: excludeId };
      }

      queryWhere = {
        ...componentContext.pathToComponent.reduceRight((acc, key) => ({ [key]: acc }), {
          [updatedAttribute.name]: value,
        }),

        ...whereConditions,
      };
    } else {
      /**
       * Here we are validating a scalar unique field from the content type's schema.
       * We construct a query to check if the value is unique
       * considering dimensions (e.g. locale, publication state) and excluding the current entity by its ID if available.
       */
      queryUid = model.uid;
      const scalarAttributeWhere: Record<string, any> = {
        [updatedAttribute.name]: value,
      };

      scalarAttributeWhere.publishedAt = options.isDraft ? null : { $notNull: true };

      if (options?.locale) {
        scalarAttributeWhere.locale = options.locale;
      }

      if (entity?.id) {
        scalarAttributeWhere.id = { $ne: entity.id };
      }

      queryWhere = scalarAttributeWhere;
    }

    // The validation should pass if there is no other record found from the query
    // TODO query not working for dynamic zones (type === relation)
    return !(await strapi.db.query(queryUid).findOne({ where: queryWhere }));
  });
};

/* Type validators */

const stringValidator = (
  metas: ValidatorMetas<
    | Schema.Attribute.String
    | Schema.Attribute.Text
    | Schema.Attribute.RichText
    | Schema.Attribute.Password
    | Schema.Attribute.Email
    | Schema.Attribute.UID
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

const emailValidator = (
  metas: ValidatorMetas<Schema.Attribute.Email>,
  options: ValidatorOptions
) => {
  const schema = stringValidator(metas, options);
  return schema.email().min(1, '${path} cannot be empty');
};

const uidValidator = (metas: ValidatorMetas<Schema.Attribute.UID>, options: ValidatorOptions) => {
  const schema = stringValidator(metas, options);

  return schema.matches(/^[A-Za-z0-9-_.~]*$/);
};

const enumerationValidator = ({ attr }: { attr: Schema.Attribute.Enumeration }) => {
  return yup
    .string()
    .oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null as any));
};

const integerValidator = (
  metas: ValidatorMetas<Schema.Attribute.Integer | Schema.Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  let schema = yup.number().integer();

  schema = addMinIntegerValidator(schema, metas);
  schema = addMaxIntegerValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

const floatValidator = (
  metas: ValidatorMetas<Schema.Attribute.Decimal | Schema.Attribute.Float>,
  options: ValidatorOptions
) => {
  let schema = yup.number();
  schema = addMinFloatValidator(schema, metas);
  schema = addMaxFloatValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

const bigintegerValidator = (
  metas: ValidatorMetas<Schema.Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas, options);
};

const datesValidator = (
  metas: ValidatorMetas<
    | Schema.Attribute.Date
    | Schema.Attribute.DateTime
    | Schema.Attribute.Time
    | Schema.Attribute.Timestamp
  >,
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
