import { translatedErrors } from '@strapi/admin/strapi-admin';
import pipe from 'lodash/fp/pipe';
import * as yup from 'yup';

import { DOCUMENT_META_FIELDS } from '../constants/attributes';

import type { ComponentsDictionary, Schema } from '../hooks/useDocument';
import type { Schema as SchemaUtils } from '@strapi/types';
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

interface ValidationOptions {
  status: 'draft' | 'published' | null;
}

const arrayValidator = (attribute: Schema['attributes'][string], options: ValidationOptions) => ({
  message: translatedErrors.required,
  test(value: unknown) {
    if (options.status === 'draft') {
      return true;
    }

    if (!attribute.required) {
      return true;
    }

    if (!value) {
      return false;
    }

    if (Array.isArray(value) && value.length === 0) {
      return false;
    }

    return true;
  },
});

/**
 * TODO: should we create a Map to store these based on the hash of the schema?
 */
const createYupSchema = (
  attributes: Schema['attributes'] = {},
  components: ComponentsDictionary = {},
  options: ValidationOptions = { status: null }
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
            addNullableValidation,
            addRequiredValidation,
            addMinLengthValidation,
            addMaxLengthValidation,
            addMinValidation,
            addMaxValidation,
            addRegexValidation,
          ].map((fn) => fn(attribute, options));

          const transformSchema = pipe(...validations);

          switch (attribute.type) {
            case 'component': {
              const { attributes } = components[attribute.component];

              if (attribute.repeatable) {
                return {
                  ...acc,
                  [name]: transformSchema(
                    yup.array().of(createModelSchema(attributes).nullable(false))
                  ).test(arrayValidator(attribute, options)),
                };
              } else {
                return {
                  ...acc,
                  [name]: transformSchema(createModelSchema(attributes).nullable()),
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
                        const attributes = components?.[data?.__component]?.attributes;

                        const validation = yup
                          .object()
                          .shape({
                            __component: yup.string().required().oneOf(Object.keys(components)),
                          })
                          .nullable(false);
                        if (!attributes) {
                          return validation;
                        }

                        return validation.concat(createModelSchema(attributes));
                      }
                    ) as unknown as yup.ObjectSchema<any>
                  )
                ).test(arrayValidator(attribute, options)),
              };
            case 'relation':
              return {
                ...acc,
                [name]: transformSchema(
                  yup.lazy((value) => {
                    if (!value) {
                      return yup.mixed().nullable(true);
                    } else if (Array.isArray(value)) {
                      // If a relation value is an array, we expect
                      // an array of objects with {id} properties, representing the related entities.
                      return yup.array().of(
                        yup.object().shape({
                          id: yup.number().required(),
                        })
                      );
                    } else if (typeof value === 'object') {
                      // A realtion value can also be an object. Some API
                      // repsonses return the number of entities in the relation
                      // as { count: x }
                      return yup.object();
                    } else {
                      return yup
                        .mixed()
                        .test(
                          'type-error',
                          'Relation values must be either null, an array of objects with {id} or an object.',
                          () => false
                        );
                    }
                  })
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
      return yup.mixed().test('isBlocks', translatedErrors.json, (value) => {
        if (!value || Array.isArray(value)) {
          return true;
        } else {
          return false;
        }
      });
    case 'decimal':
    case 'float':
    case 'integer':
      return yup.number();
    case 'email':
      return yup.string().email(translatedErrors.email);
    case 'enumeration':
      return yup.string().oneOf([...attribute.enum, null]);
    case 'json':
      return yup.mixed().test('isJSON', translatedErrors.json, (value) => {
        /**
         * We don't want to validate the JSON field if it's empty.
         */
        if (!value || (typeof value === 'string' && value.length === 0)) {
          return true;
        }

        // If the value was created via content API and wasn't changed, then it's still an object
        if (typeof value === 'object') {
          try {
            JSON.stringify(value);
            return true;
          } catch (err) {
            return false;
          }
        }

        try {
          JSON.parse(value);

          return true;
        } catch (err) {
          return false;
        }
      });
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

// Helper function to return schema.nullable() if it exists, otherwise return schema
const nullableSchema = <TSchema extends AnySchema>(schema: TSchema) => {
  return schema?.nullable
    ? schema.nullable()
    : // In some cases '.nullable' will not be available on the schema.
      // e.g. when the schema has been built using yup.lazy (e.g. for relations).
      // In these cases we should just return the schema as it is.
      schema;
};

/* -------------------------------------------------------------------------------------------------
 * Validators
 * -----------------------------------------------------------------------------------------------*/
/**
 * Our validator functions can be preped with the
 * attribute and then have the schema piped through them.
 */
type ValidationFn = (
  attribute: Schema['attributes'][string],
  options: ValidationOptions
) => <TSchema extends AnySchema>(schema: TSchema) => TSchema;

const addNullableValidation: ValidationFn = () => (schema) => {
  return nullableSchema(schema);
};

const addRequiredValidation: ValidationFn = (attribute, options) => (schema) => {
  if (options.status === 'draft' || !attribute.required) {
    return schema;
  }

  if (attribute.required && 'required' in schema) {
    return schema.required(translatedErrors.required);
  }

  return schema;
};

const addMinLengthValidation: ValidationFn =
  (attribute, options) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    // Skip minLength validation for draft
    if (options.status === 'draft') {
      return schema;
    }

    if (
      'minLength' in attribute &&
      attribute.minLength &&
      Number.isInteger(attribute.minLength) &&
      'min' in schema
    ) {
      return schema.min(attribute.minLength, {
        ...translatedErrors.minLength,
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
        ...translatedErrors.maxLength,
        values: {
          max: attribute.maxLength,
        },
      }) as TSchema;
    }

    return schema;
  };

const addMinValidation: ValidationFn =
  (attribute, options) =>
  <TSchema extends AnySchema>(schema: TSchema): TSchema => {
    // do not validate min for draft
    if (options.status === 'draft') {
      return schema;
    }

    if ('min' in attribute && 'min' in schema) {
      const min = toInteger(attribute.min);

      if (min) {
        return schema.min(min, {
          ...translatedErrors.min,
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
          ...translatedErrors.max,
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
          id: translatedErrors.regex.id,
          defaultMessage: 'The value does not match the defined pattern.',
        },

        excludeEmptyString: !attribute.required,
      }) as TSchema;
    }

    return schema;
  };

export { createYupSchema };
