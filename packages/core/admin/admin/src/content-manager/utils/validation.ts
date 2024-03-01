import { translatedErrors } from '@strapi/helper-plugin';
import pipe from 'lodash/fp/pipe';
import * as yup from 'yup';

import { DOCUMENT_META_FIELDS } from '../constants/attributes';

import type { ComponentsDictionary, Schema } from '../hooks/useDocument';
import type { Schema as SchemaUtils, Data } from '@strapi/types';
import type { ObjectShape } from 'yup/lib/object';

type AnySchema =
  | yup.StringSchema
  | yup.NumberSchema
  | yup.BooleanSchema
  | yup.DateSchema
  | yup.ArraySchema<any>
  | yup.ObjectSchema<any>;

/* -------------------------------------------------------------------------------------------------
 * createYupSchema
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: should we create a Map to store these based on the hash of the schema?
 */
const createYupSchema = (
  attributes: Schema['attributes'] = {},
  components: ComponentsDictionary = {}
): yup.ObjectSchema<any> => {
  const createModelSchema = (attributes: Schema['attributes']): yup.ObjectSchema<any> =>
    yup
      .object()
      .shape(
        Object.entries(attributes).reduce<ObjectShape>((acc, [name, attribute]) => {
          if (DOCUMENT_META_FIELDS.includes(name)) {
            return acc;
          }

          /**
           * These validations won't apply to every attribute
           * and that's okay, in that case we just return the
           * schema as it was passed.
           */
          const validations = [
            addRequiredValidation,
            addMinLengthValidation,
            addMaxLengthValidation,
            addMinValidation,
            addMaxValidation,
            addRegexValidation,
          ].map((fn) => fn(attribute));

          const transformSchema = pipe(...validations);

          switch (attribute.type) {
            case 'component': {
              const { attributes } = components[attribute.component];

              if (attribute.repeatable) {
                return {
                  ...acc,
                  [name]: transformSchema(
                    yup.array().of(createModelSchema(attributes).nullable(false))
                  ),
                };
              } else {
                return {
                  ...acc,
                  [name]: transformSchema(createModelSchema(attributes)),
                };
              }
            }
            case 'dynamiczone':
              return {
                ...acc,
                [name]: transformSchema(
                  yup.array().of(
                    yup.lazy(
                      (
                        data: SchemaUtils.Attribute.Value<SchemaUtils.Attribute.DynamicZone>[number]
                      ) => {
                        const { attributes } = components[data.__component];

                        return yup
                          .object()
                          .shape({
                            __component: yup.string().required().oneOf(Object.keys(components)),
                          })
                          .nullable(false)
                          .concat(createModelSchema(attributes));
                      }
                    ) as unknown as yup.ObjectSchema<any>
                  )
                ),
              };
            case 'relation':
              return {
                ...acc,
                [name]: transformSchema(
                  yup.array().of(
                    yup.object().shape({
                      id: yup.string().required(),
                    })
                  )
                ),
              };
            default:
              return {
                ...acc,
                [name]: transformSchema(createAttributeSchema(attribute)),
              };
          }
        }, {})
      )
      /**
       * TODO: investigate why an undefined object fails a check of `nullable`.
       */
      .default(null);

  return createModelSchema(attributes);
};

const createAttributeSchema = (
  attribute: Exclude<
    SchemaUtils.Attribute.AnyAttribute,
    { type: 'dynamiczone' } | { type: 'component' } | { type: 'relation' }
  >
) => {
  switch (attribute.type) {
    case 'biginteger':
      return yup.string().matches(/^-?\d*$/);
    case 'boolean':
      return yup.boolean();
    case 'blocks':
      return yup.mixed().test(
        'isBlocks',
        {
          id: translatedErrors.json,
          defaultMessage: "This doesn't match the JSON format",
        },
        (value) => {
          if (!value || Array.isArray(value)) {
            return true;
          } else {
            return false;
          }
        }
      );
    case 'decimal':
    case 'float':
    case 'integer':
      return yup.number();
    case 'email':
      return yup.string().email({
        id: translatedErrors.email,
        defaultMessage: 'This is not a valid email.',
      });
    case 'enumeration':
      return yup.string().oneOf([...attribute.enum, null]);
    case 'json':
      return yup.mixed().test(
        'isJSON',
        {
          id: translatedErrors.json,
          defaultMessage: "This doesn't match the JSON format",
        },
        (value) => {
          /**
           * We don't want to validate the JSON field if it's empty.
           */
          if (!value || (typeof value === 'string' && value.length === 0)) {
            return true;
          }

          try {
            JSON.parse(value);

            return true;
          } catch (err) {
            return false;
          }
        }
      );
    case 'password':
    case 'richtext':
    case 'string':
    case 'text':
      return yup.string();
    case 'uid':
      return yup.string().matches(/^[A-Za-z0-9-_.~]*$/);
    default:
      /**
       * This allows any value.
       */
      return yup.mixed();
  }
};

/* -------------------------------------------------------------------------------------------------
 * Validators
 * -----------------------------------------------------------------------------------------------*/
/**
 * Our validator functions can be preped with the
 * attribute and then have the schema piped through them.
 */
type ValidationFn = (
  attribute: Schema['attributes'][string]
) => <TSchema extends AnySchema>(schema: TSchema) => TSchema;

const addRequiredValidation: ValidationFn = (attribute) => (schema) => {
  if (attribute.required) {
    return schema.required({
      id: translatedErrors.required,
      defaultMessage: 'This field is required.',
    });
  }

  return schema.nullable();
};

const addMinLengthValidation: ValidationFn =
  (attribute) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    if (
      'minLength' in attribute &&
      attribute.minLength &&
      Number.isInteger(attribute.minLength) &&
      'min' in schema
    ) {
      return schema.min(attribute.minLength, {
        id: translatedErrors.minLength,
        defaultMessage: 'The value is too short (min: {min}).',
        values: {
          min: attribute.minLength,
        },
      }) as TSchema;
    }

    return schema;
  };

const addMaxLengthValidation: ValidationFn =
  (attribute) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    if (
      'maxLength' in attribute &&
      attribute.maxLength &&
      Number.isInteger(attribute.maxLength) &&
      'max' in schema
    ) {
      return schema.max(attribute.maxLength, {
        id: translatedErrors.maxLength,
        defaultMessage: 'The value is too long (max: {max}).',
        values: {
          max: attribute.maxLength,
        },
      }) as TSchema;
    }

    return schema;
  };

const addMinValidation: ValidationFn =
  (attribute) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    if ('min' in attribute) {
      const min = toInteger(attribute.min);

      if ('min' in schema && min) {
        return schema.min(min, {
          id: translatedErrors.min,
          defaultMessage: 'The value is too low (min: {min}).',
          values: {
            min,
          },
        }) as TSchema;
      }
    }

    return schema;
  };

const addMaxValidation: ValidationFn =
  (attribute) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    if ('max' in attribute) {
      const max = toInteger(attribute.max);

      if ('max' in schema && max) {
        return schema.max(max, {
          id: translatedErrors.max,
          defaultMessage: 'The value is too high (max: {max}).',
          values: {
            max,
          },
        }) as TSchema;
      }
    }

    return schema;
  };

const toInteger = (val?: string | number): number | undefined => {
  if (typeof val === 'number' || val === undefined) {
    return val;
  } else {
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }
};

const addRegexValidation: ValidationFn =
  (attribute) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    if ('regex' in attribute && attribute.regex && 'matches' in schema) {
      return schema.matches(new RegExp(attribute.regex), {
        message: {
          id: translatedErrors.regex,
          defaultMessage: 'The value does not match the defined pattern.',
        },
        excludeEmptyString: !attribute.required,
      }) as TSchema;
    }

    return schema;
  };

export { createYupSchema };
