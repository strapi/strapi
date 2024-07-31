import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import { Attribute } from '@strapi/types';
import isBoolean from 'lodash/isBoolean';
import isEmpty from 'lodash/isEmpty';
import isNaN from 'lodash/isNaN';
import toNumber from 'lodash/toNumber';
import * as yup from 'yup';

import { isFieldTypeNumber } from './fields';
import { FormattedComponentLayout, FormattedContentTypeLayout } from './layouts';

import type Lazy from 'yup/lib/Lazy';
import type { MixedSchema } from 'yup/lib/mixed';

/* -------------------------------------------------------------------------------------------------
 * createYupSchema
 * -----------------------------------------------------------------------------------------------*/

/**
 * TODO: this whole thing needs actually fixing because it's useless without types
 * but it obviously something has gone wrong between conception and now for it to need
 * this many ts-error directives.
 *
 * See CONTENT-2107
 */

interface CreateYupSchemaOpts {
  isCreatingEntry?: boolean;
  isDraft?: boolean;
  isFromComponent?: boolean;
  isJSONTestDisabled?: boolean;
}

const createYupSchema = (
  model: FormattedContentTypeLayout | FormattedComponentLayout,
  { components }: { components: Record<string, FormattedComponentLayout> },
  options: CreateYupSchemaOpts = {
    isCreatingEntry: true,
    isDraft: true,
    isFromComponent: false,
    isJSONTestDisabled: false,
  }
) => {
  const { attributes } = model;

  return yup.object().shape(
    Object.keys(attributes).reduce<Record<string, MixedSchema | Lazy<any>>>((acc, current) => {
      const attribute = attributes[current];

      if (
        attribute.type !== 'relation' &&
        attribute.type !== 'component' &&
        attribute.type !== 'dynamiczone'
      ) {
        // @ts-expect-error – see comment at top of file
        const formatted = createYupSchemaAttribute(attribute.type, attribute, options);
        acc[current] = formatted;
      }

      if (attribute.type === 'relation') {
        acc[current] = [
          'oneWay',
          'oneToOne',
          'manyToOne',
          'oneToManyMorph',
          'oneToOneMorph',
          // @ts-expect-error – see comment at top of file
        ].includes(attribute.relationType)
          ? yup.object().nullable()
          : yup.array().nullable();
      }

      if (attribute.type === 'component') {
        const componentFieldSchema = createYupSchema(
          components[attribute.component],
          {
            components,
          },
          { ...options, isFromComponent: true }
        );

        if (attribute.repeatable === true) {
          const { min, max, required } = attribute;

          const componentSchema = yup.lazy((value) => {
            let baseSchema = yup.array().of(componentFieldSchema);

            if (min) {
              if (required) {
                baseSchema = baseSchema.min(min, errorsTrads.min);
                // @ts-expect-error – see comment at top of file
              } else if (required !== true && isEmpty(value)) {
                // @ts-expect-error – see comment at top of file
                baseSchema = baseSchema.nullable();
              } else {
                baseSchema = baseSchema.min(min, errorsTrads.min);
              }
            } else if (required && !options.isDraft) {
              baseSchema = baseSchema.min(1, errorsTrads.required);
            }

            if (max) {
              baseSchema = baseSchema.max(max, errorsTrads.max);
            }

            return baseSchema;
          });

          acc[current] = componentSchema;

          return acc;
        }
        const componentSchema = yup.lazy((obj) => {
          if (obj !== undefined) {
            return attribute.required === true && !options.isDraft
              ? componentFieldSchema.defined()
              : componentFieldSchema.nullable();
          }

          return attribute.required === true ? yup.object().defined() : yup.object().nullable();
        });

        acc[current] = componentSchema;

        return acc;
      }

      if (attribute.type === 'dynamiczone') {
        let dynamicZoneSchema = yup.array().of(
          // @ts-expect-error – see comment at top of file
          yup.lazy(({ __component }) => {
            return createYupSchema(
              components[__component],
              { components },
              { ...options, isFromComponent: true }
            );
          })
        );

        const { max, min } = attribute;

        if (min) {
          if (attribute.required) {
            dynamicZoneSchema = dynamicZoneSchema
              // @ts-expect-error – see comment at top of file
              .test('min', errorsTrads.min, (value) => {
                if (options.isCreatingEntry) {
                  return value && value.length >= min;
                }

                if (value === undefined) {
                  return true;
                }

                return value !== null && value.length >= min;
              })
              .test('required', errorsTrads.required, (value) => {
                if (options.isCreatingEntry) {
                  return value !== null || value !== undefined;
                }

                if (value === undefined) {
                  return true;
                }

                return value !== null;
              });
          } else {
            // @ts-expect-error – see comment at top of file
            dynamicZoneSchema = dynamicZoneSchema.notEmptyMin(min);
          }
        } else if (attribute.required && !options.isDraft) {
          dynamicZoneSchema = dynamicZoneSchema.test('required', errorsTrads.required, (value) => {
            if (options.isCreatingEntry) {
              return value !== null || value !== undefined;
            }

            if (value === undefined) {
              return true;
            }

            return value !== null;
          });
        }

        if (max) {
          dynamicZoneSchema = dynamicZoneSchema.max(max, errorsTrads.max);
        }

        acc[current] = dynamicZoneSchema;
      }

      return acc;
    }, {})
  );
};

const createYupSchemaAttribute = (
  type: Attribute.Any['type'],
  validations: Exclude<
    Attribute.Any,
    { type: 'dynamiczone' } | { type: 'component' } | { type: 'relation' }
  >,
  options: Required<CreateYupSchemaOpts>
) => {
  let schema = yup.mixed();

  if (['string', 'uid', 'text', 'richtext', 'email', 'password', 'enumeration'].includes(type)) {
    schema = yup.string();
  }

  if (type === 'blocks') {
    schema = yup.mixed().test('isJSON', errorsTrads.json, (value) => {
      // Disable the test for bulk publish, it's valid when it comes from the db
      if (options.isJSONTestDisabled) {
        return true;
      }

      // Don't run validations on drafts
      if (options.isDraft) {
        return true;
      }

      // The backend validates the actual schema, check if a value different than null is not an array
      if (value && !Array.isArray(value)) {
        return false;
      }

      return true;
    });
  }

  if (type === 'json') {
    schema = yup
      // @ts-expect-error – see comment at top of file
      .mixed(errorsTrads.json)
      .test('isJSON', errorsTrads.json, (value) => {
        // Disable the test for bulk publish, it's valid when it comes from the db
        if (options.isJSONTestDisabled) {
          return true;
        }

        if (!value || !value.length) {
          return true;
        }

        try {
          JSON.parse(value);

          return true;
        } catch (err) {
          return false;
        }
      })
      .nullable()
      .test('required', errorsTrads.required, (value) => {
        if (validations.required && (!value || !value.length)) {
          return false;
        }

        return true;
      });
  }

  if (type === 'email') {
    // @ts-expect-error – see comment at top of file
    schema = schema.email(errorsTrads.email);
  }

  if (['number', 'integer', 'float', 'decimal'].includes(type)) {
    schema = yup
      .number()
      .transform((cv) => (isNaN(cv) ? undefined : cv))
      // @ts-expect-error – see comment at top of file
      .typeError();
  }

  if (type === 'biginteger') {
    schema = yup.string().matches(/^-?\d*$/);
  }

  if (['date', 'datetime'].includes(type)) {
    schema = yup.date();
  }

  Object.keys(validations).forEach((validation) => {
    const validationValue = validations[validation as keyof typeof validations];

    if (
      !!validationValue ||
      // @ts-expect-error – see comment at top of file
      (!isBoolean(validationValue) && Number.isInteger(Math.floor(validationValue))) ||
      // @ts-expect-error – see comment at top of file
      validationValue === 0
    ) {
      switch (validation) {
        case 'required': {
          if (!options.isDraft) {
            if (type === 'password' && options.isCreatingEntry) {
              schema = schema.required(errorsTrads.required);
            }

            if (type !== 'password') {
              if (options.isCreatingEntry) {
                schema = schema.required(errorsTrads.required);
              } else {
                schema = schema.test('required', errorsTrads.required, (value) => {
                  // Field is not touched and the user is editing the entry
                  if (value === undefined && !options.isFromComponent) {
                    return true;
                  }

                  if (isFieldTypeNumber(type)) {
                    if (value === 0) {
                      return true;
                    }

                    return !!value;
                  }

                  if (type === 'boolean') {
                    // Boolean value can be undefined/unset in modifiedData when generated in a new component
                    return value !== null && value !== undefined;
                  }

                  if (type === 'date' || type === 'datetime') {
                    if (typeof value === 'string') {
                      return !isEmpty(value);
                    }

                    return !isEmpty(value?.toString());
                  }

                  return !isEmpty(value);
                });
              }
            }
          }

          break;
        }

        case 'max': {
          if (type === 'biginteger') {
            // @ts-expect-error – see comment at top of file
            schema = schema.isInferior(errorsTrads.max, validationValue);
          } else {
            // @ts-expect-error – see comment at top of file
            schema = schema.max(validationValue, errorsTrads.max);
          }
          break;
        }
        case 'maxLength':
          // @ts-expect-error – see comment at top of file
          schema = schema.max(validationValue, errorsTrads.maxLength);
          break;
        case 'min': {
          if (type === 'biginteger') {
            // @ts-expect-error – see comment at top of file
            schema = schema.isSuperior(errorsTrads.min, validationValue);
          } else {
            // @ts-expect-error – see comment at top of file
            schema = schema.min(validationValue, errorsTrads.min);
          }
          break;
        }
        case 'minLength': {
          if (!options.isDraft) {
            // @ts-expect-error – see comment at top of file
            schema = schema.min(validationValue, errorsTrads.minLength);
          }
          break;
        }
        case 'regex':
          // @ts-expect-error – see comment at top of file
          schema = schema.matches(new RegExp(validationValue), {
            message: errorsTrads.regex,
            excludeEmptyString: !validations.required,
          });
          break;
        case 'lowercase':
          if (['text', 'textarea', 'email', 'string'].includes(type)) {
            // @ts-expect-error – see comment at top of file
            schema = schema.strict().lowercase();
          }
          break;
        case 'uppercase':
          if (['text', 'textarea', 'email', 'string'].includes(type)) {
            // @ts-expect-error – see comment at top of file
            schema = schema.strict().uppercase();
          }
          break;
        case 'positive':
          if (isFieldTypeNumber(type)) {
            // @ts-expect-error – see comment at top of file
            schema = schema.positive();
          }
          break;
        case 'negative':
          if (isFieldTypeNumber(type)) {
            // @ts-expect-error – see comment at top of file
            schema = schema.negative();
          }
          break;
        default:
          schema = schema.nullable();
      }
    }
  });

  return schema;
};

/* -------------------------------------------------------------------------------------------------
 * Addition Yup methods
 * -----------------------------------------------------------------------------------------------*/

yup.addMethod(yup.mixed, 'defined', function () {
  return this.test('defined', errorsTrads.required, (value) => value !== undefined);
});

yup.addMethod(yup.array, 'notEmptyMin', function (min) {
  return this.test('notEmptyMin', errorsTrads.min, (value) => {
    if (!value || !value.length) {
      return true;
    }

    return value.length >= min;
  });
});

yup.addMethod(yup.string, 'isInferior', function (message, max) {
  return this.test('isInferior', message, function (value) {
    if (!value) {
      return true;
    }

    if (Number.isNaN(toNumber(value))) {
      return true;
    }

    return toNumber(max) >= toNumber(value);
  });
});

yup.addMethod(yup.string, 'isSuperior', function (message, min) {
  return this.test('isSuperior', message, function (value) {
    if (!value) {
      return true;
    }

    if (Number.isNaN(toNumber(value))) {
      return true;
    }

    return toNumber(value) >= toNumber(min);
  });
});

export { createYupSchema };
