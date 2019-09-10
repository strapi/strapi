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

const errorsTrads = {
  email: 'components.Input.error.validation.email',
  json: 'components.Input.error.validation.json',
  max: 'components.Input.error.validation.max',
  maxLength: 'components.Input.error.validation.maxLength',
  min: 'components.Input.error.validation.min',
  minLength: 'components.Input.error.validation.minLength',
  regex: 'components.Input.error.validation.regex',
  required: 'components.Input.error.validation.required',
};

yup.addMethod(yup.mixed, 'defined', function() {
  return this.test(
    'defined',
    errorsTrads.required,
    value => value !== undefined
  );
});

const getAttributes = data => get(data, ['schema', 'attributes'], {});

const createYupSchema = (model, { groups }) => {
  const attributes = getAttributes(model);

  return yup.object().shape(
    Object.keys(attributes).reduce((acc, current) => {
      const attribute = attributes[current];
      if (attribute.type !== 'relation' && attribute.type !== 'group') {
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

      if (attribute.type === 'group') {
        const groupFieldSchema = createYupSchema(groups[attribute.group], {
          groups,
        });

        if (attribute.repeatable === true) {
          const groupSchema =
            attribute.required === true
              ? yup
                  .array()
                  .of(groupFieldSchema)
                  .defined()
              : yup
                  .array()
                  .of(groupFieldSchema)
                  .nullable();

          acc[current] = groupSchema;

          return acc;
        } else {
          const groupSchema = yup.lazy(obj => {
            if (obj !== undefined) {
              return attribute.required === true
                ? groupFieldSchema.defined()
                : groupFieldSchema.nullable();
            }

            return attribute.required === true
              ? yup.object().defined()
              : yup.object().nullable();
          });

          acc[current] = groupSchema;

          return acc;
        }
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
    schema = yup.date().typeError();
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
