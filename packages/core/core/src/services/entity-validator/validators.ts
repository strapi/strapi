/**
 * Validators check if the entry data meets specific criteria before saving or publishing.
 * (e.g., length, range, format).
 *
 * Drafts have limited validations (mainly max constraints),
 * while published content undergoes full validation.
 *
 * The system also takes locales into account when validating data.
 * E.g, unique fields must be unique within the same locale.
 */
import _ from 'lodash';
import { yup } from '@strapi/utils';
import type { Schema, Struct, Modules } from '@strapi/types';
import { blocksValidator } from './blocks-validator';

import type { ComponentContext } from '.';

export interface ValidatorMetas<
  TAttribute extends Schema.Attribute.AnyAttribute = Schema.Attribute.AnyAttribute,
  TValue extends Schema.Attribute.Value<TAttribute> = Schema.Attribute.Value<TAttribute>,
> {
  attr: TAttribute;
  model: Struct.Schema;
  updatedAttribute: {
    name: string;
    value: TValue;
  };
  componentContext?: ComponentContext;
  entity?: Modules.EntityValidator.Entity;
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
  },
  { isDraft }: ValidatorOptions
) => (_.isNumber(attr.min) && !isDraft ? validator.min(_.toInteger(attr.min)) : validator);

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
  },
  { isDraft }: ValidatorOptions
) => (_.isNumber(attr.min) && !isDraft ? validator.min(attr.min) : validator);

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
  },
  { isDraft }: ValidatorOptions
) => {
  return 'regex' in attr && !_.isUndefined(attr.regex) && !isDraft
    ? validator.matches(new RegExp(attr.regex), { excludeEmptyString: !attr.required })
    : validator;
};

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

  const validateUniqueFieldWithinComponent = async (value: any): Promise<boolean> => {
    if (!componentContext) {
      return false;
    }

    // If we are validating a unique field within a repeatable component,
    // we first need to ensure that the repeatable in the current entity is
    // valid against itself.
    const hasRepeatableData = componentContext.repeatableData.length > 0;
    if (hasRepeatableData) {
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

    const whereConditions: Record<string, any> = {};
    const isParentDraft = parentOptions && parentOptions.isDraft;

    whereConditions.publishedAt = isParentDraft ? null : { $notNull: true };

    if (parentOptions?.locale) {
      whereConditions.locale = parentOptions.locale;
    }

    if (excludeId && !Number.isNaN(excludeId)) {
      whereConditions.id = { $ne: excludeId };
    }

    const queryUid = parentModel.uid;
    const queryWhere = {
      ...componentContext.pathToComponent.reduceRight((acc, key) => ({ [key]: acc }), {
        [updatedAttribute.name]: value,
      }),

      ...whereConditions,
    };

    // The validation should pass if there is no other record found from the query
    return !(await strapi.db.query(queryUid).findOne({ where: queryWhere }));
  };

  const validateUniqueFieldWithinDynamicZoneComponent = async (
    startOfPath: string
  ): Promise<boolean> => {
    if (!componentContext) {
      return false;
    }

    const targetComponentUID = model.uid;
    // Ensure that the value is unique within the dynamic zone in this entity.
    const countOfValueInThisEntity = (componentContext?.fullDynamicZoneContent ?? []).reduce(
      (acc, component) => {
        if (component.__component !== targetComponentUID) {
          return acc;
        }

        const updatedValue = component[updatedAttribute.name];
        return updatedValue === updatedAttribute.value ? acc + 1 : acc;
      },
      0
    );

    if (countOfValueInThisEntity > 1) {
      // If the value is repeated in the current entity, the validation fails.
      return false;
    }

    // Build a query for the parent content type to find all entities in the
    // same locale and publication state
    type QueryType = {
      select: string[];
      where: {
        published_at?: { $eq: null } | { $ne: null };
        id?: { $ne: number };
        locale?: string;
      };
      populate: {
        [key: string]: {
          on: {
            [key: string]: {
              select: string[];
              where: { [key: string]: string | number | boolean };
            };
          };
        };
      };
    };

    // Populate the dynamic zone for any components that share the same value
    // as the updated attribute.
    const query: QueryType = {
      select: ['id'],
      where: {},
      populate: {
        [startOfPath]: {
          on: {
            [targetComponentUID]: {
              select: ['id'],
              where: { [updatedAttribute.name]: updatedAttribute.value },
            },
          },
        },
      },
    };

    const { options, id } = componentContext.parentContent;

    if (options?.isDraft !== undefined) {
      query.where.published_at = options.isDraft ? { $eq: null } : { $ne: null };
    }

    if (id) {
      query.where.id = { $ne: id };
    }

    if (options?.locale) {
      query.where.locale = options.locale;
    }

    const parentModelQueryResult = await strapi.db
      .query(componentContext.parentContent.model.uid)
      .findMany(query);

    // Filter the results to only include results that have components in the
    // dynamic zone that match the target component type.
    const filteredResults = parentModelQueryResult
      .filter((result) => Array.isArray(result[startOfPath]) && result[startOfPath].length)
      .flatMap((result) => result[startOfPath])
      .filter((dynamicZoneComponent) => dynamicZoneComponent.__component === targetComponentUID);

    if (filteredResults.length >= 1) {
      return false;
    }

    return true;
  };

  return validator.test('unique', 'This attribute must be unique', async (value) => {
    /**
     * If the attribute value is `null` or an empty string we want to skip the unique validation.
     * Otherwise it'll only accept a single entry with that value in the database.
     */
    if (_.isNil(value) || value === '') {
      return true;
    }

    /**
     * We don't validate any unique constraint for draft entries.
     */
    if (options.isDraft) {
      return true;
    }

    const hasPathToComponent = componentContext && componentContext.pathToComponent.length > 0;
    if (hasPathToComponent) {
      // Detect if we are validating within a dynamiczone by checking if the first
      // path is a dynamiczone attribute in the parent content type.
      const startOfPath = componentContext.pathToComponent[0];
      const testingDZ =
        componentContext.parentContent.model.attributes[startOfPath].type === 'dynamiczone';

      if (testingDZ) {
        return validateUniqueFieldWithinDynamicZoneComponent(startOfPath);
      }

      return validateUniqueFieldWithinComponent(value);
    }

    /**
     * Here we are validating a scalar unique field from the content type's schema.
     * We construct a query to check if the value is unique
     * considering dimensions (e.g. locale, publication state) and excluding the current entity by its ID if available.
     */
    const scalarAttributeWhere: Record<string, any> = {
      [updatedAttribute.name]: value,
      publishedAt: { $notNull: true },
    };

    if (options?.locale) {
      scalarAttributeWhere.locale = options.locale;
    }

    if (entity?.id) {
      scalarAttributeWhere.id = { $ne: entity.id };
    }

    // The validation should pass if there is no other record found from the query
    return !(await strapi.db
      .query(model.uid)
      .findOne({ where: scalarAttributeWhere, select: ['id'] }));
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
  schema = addStringRegexValidator(schema, metas, options);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

export const emailValidator = (
  metas: ValidatorMetas<Schema.Attribute.Email>,
  options: ValidatorOptions
) => {
  const schema = stringValidator(metas, options);

  if (options.isDraft) {
    return schema;
  }

  return schema.email().min(
    1,
    // eslint-disable-next-line no-template-curly-in-string
    '${path} cannot be empty'
  );
};

export const uidValidator = (
  metas: ValidatorMetas<Schema.Attribute.UID>,
  options: ValidatorOptions
) => {
  const schema = stringValidator(metas, options);

  if (options.isDraft) {
    return schema;
  }

  return schema.matches(/^[A-Za-z0-9-_.~]*$/);
};

export const enumerationValidator = ({ attr }: { attr: Schema.Attribute.Enumeration }) => {
  return yup
    .string()
    .oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null as any));
};

export const integerValidator = (
  metas: ValidatorMetas<Schema.Attribute.Integer | Schema.Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  let schema = yup.number().integer();

  schema = addMinIntegerValidator(schema, metas, options);
  schema = addMaxIntegerValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

export const floatValidator = (
  metas: ValidatorMetas<Schema.Attribute.Decimal | Schema.Attribute.Float>,
  options: ValidatorOptions
) => {
  let schema = yup.number();

  schema = addMinFloatValidator(schema, metas, options);
  schema = addMaxFloatValidator(schema, metas);
  schema = addUniqueValidator(schema, metas, options);

  return schema;
};

export const bigintegerValidator = (
  metas: ValidatorMetas<Schema.Attribute.BigInteger>,
  options: ValidatorOptions
) => {
  const schema = yup.mixed();
  return addUniqueValidator(schema, metas, options);
};

export const datesValidator = (
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

export const Validators = {
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
