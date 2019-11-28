import {
  get,
  isBoolean,
  isNaN,
  isNumber,
  isNull,
  isArray,
  isObject,
} from 'lodash';
import * as yup from 'yup';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';

yup.addMethod(yup.mixed, 'defined', function() {
  return this.test(
    'defined',
    errorsTrads.required,
    value => value !== undefined
  );
});

const getAttributes = data => get(data, ['schema', 'attributes'], {});

const createYupSchema = (model, { components }) => {
  const attributes = getAttributes(model);

  return yup.object().shape(
    Object.keys(attributes).reduce((acc, current) => {
      const attribute = attributes[current];
      if (
        attribute.type !== 'relation' &&
        attribute.type !== 'component' &&
        attribute.type !== 'dynamiczone'
      ) {
        const formatted = createYupSchemaAttribute(attribute.type, attribute);
        acc[current] = formatted;
      }

      if (attribute.type === 'relation') {
        acc[current] = [
          'oneWay',
          'oneToOne',
          'manyToOne',
          'oneToManyMorph',
          'oneToOneMorph',
        ].includes(attribute.relationType)
          ? yup.object().nullable()
          : yup.array().nullable();
      }

      if (attribute.type === 'component') {
        const componentFieldSchema = createYupSchema(
          components[attribute.component],
          {
            components,
          }
        );

        if (attribute.repeatable === true) {
          const { min, max } = attribute;

          let componentSchema =
            attribute.required === true
              ? yup
                  .array()
                  .of(componentFieldSchema)
                  .defined()
              : yup
                  .array()
                  .of(componentFieldSchema)
                  .nullable();

          if (min) {
            componentSchema = componentSchema.min(min, errorsTrads.min);
          }

          if (max) {
            componentSchema = componentSchema.max(max, errorsTrads.max);
          }

          acc[current] = componentSchema;

          return acc;
        } else {
          const componentSchema = yup.lazy(obj => {
            if (obj !== undefined) {
              return attribute.required === true
                ? componentFieldSchema.defined()
                : componentFieldSchema.nullable();
            }

            return attribute.required === true
              ? yup.object().defined()
              : yup.object().nullable();
          });

          acc[current] = componentSchema;

          return acc;
        }
      }

      if (attribute.type === 'dynamiczone') {
        let dynamicZoneSchema = yup.array().of(
          yup.lazy(({ __component }) => {
            return createYupSchema(components[__component], { components });
          })
        );

        const { max, min } = attribute;

        if (attribute.required) {
          dynamicZoneSchema = dynamicZoneSchema.required();

          if (min) {
            dynamicZoneSchema = dynamicZoneSchema
              .min(min, errorsTrads.min)
              .required(errorsTrads.required);
          }
        } else {
          if (min) {
            dynamicZoneSchema = dynamicZoneSchema.min(min, errorsTrads.min);
          }
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

const createYupSchemaAttribute = (type, validations) => {
  let schema = yup.mixed();
  if (
    ['string', 'text', 'richtext', 'email', 'password', 'enumeration'].includes(
      type
    )
  ) {
    schema = yup.string();
  }
  if (type === 'json') {
    schema = yup
      .mixed(errorsTrads.json)
      .test('isJSON', errorsTrads.json, value => {
        try {
          if (
            isObject(value) ||
            isBoolean(value) ||
            isNumber(value) ||
            isArray(value) ||
            isNaN(value) ||
            isNull(value)
          ) {
            JSON.parse(JSON.stringify(value));
            return true;
          }

          return false;
        } catch (err) {
          return false;
        }
      })
      .nullable();
  }

  if (type === 'email') {
    schema = schema.email(errorsTrads.email);
  }
  if (['number', 'integer', 'biginteger', 'float', 'decimal'].includes(type)) {
    schema = yup
      .number()
      .transform(cv => (isNaN(cv) ? undefined : cv))
      .typeError();
  }
  if (['date', 'datetime'].includes(type)) {
    schema = yup.date();
  }

  Object.keys(validations).forEach(validation => {
    const validationValue = validations[validation];
    if (
      !!validationValue ||
      ((!isBoolean(validationValue) &&
        Number.isInteger(Math.floor(validationValue))) ||
        validationValue === 0)
    ) {
      switch (validation) {
        case 'required':
          schema = schema.required(errorsTrads.required);
          break;
        case 'max':
          schema = schema.max(validationValue, errorsTrads.max);
          break;
        case 'maxLength':
          schema = schema.max(validationValue, errorsTrads.maxLength);
          break;
        case 'min':
          schema = schema.min(validationValue, errorsTrads.min);
          break;
        case 'minLength':
          schema = schema.min(validationValue, errorsTrads.minLength);
          break;
        case 'regex':
          schema = schema.matches(validationValue, errorsTrads.regex);
          break;
        case 'lowercase':
          if (['text', 'textarea', 'email', 'string'].includes(type)) {
            schema = schema.strict().lowercase();
          }
          break;
        case 'uppercase':
          if (['text', 'textarea', 'email', 'string'].includes(type)) {
            schema = schema.strict().uppercase();
          }
          break;
        case 'positive':
          if (
            ['number', 'integer', 'bigint', 'float', 'decimal'].includes(type)
          ) {
            schema = schema.positive();
          }
          break;
        case 'negative':
          if (
            ['number', 'integer', 'bigint', 'float', 'decimal'].includes(type)
          ) {
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

export default createYupSchema;
