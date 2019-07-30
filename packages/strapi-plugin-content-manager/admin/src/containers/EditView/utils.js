import {
  cloneDeep,
  get,
  isBoolean,
  isNaN,
  isNumber,
  isNull,
  isArray,
  isObject,
  set,
  unset,
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
        let groupSchema = createYupSchema(groups[attribute.group], {
          groups,
        });
        groupSchema =
          attribute.repeatable === true
            ? yup.array().of(groupSchema)
            : groupSchema;
        groupSchema =
          attribute.required === true ? groupSchema.required() : groupSchema;
        acc[current] = groupSchema;
      }
      return acc;
    }, {})
  );
};
const createYupSchemaAttribute = (type, validations) => {
  let schema = yup.mixed();
  if (['string', 'text', 'email', 'password', 'enumeration'].includes(type)) {
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
  if (type === 'number') {
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

const getMediaAttributes = (ctLayout, groupLayouts) => {
  const getMedia = (
    layout,
    prefix = '',
    isGroupType = false,
    repeatable = false
  ) => {
    const attributes = get(layout, ['schema', 'attributes'], {});

    return Object.keys(attributes).reduce((acc, current) => {
      const type = get(attributes, [current, 'type']);
      const multiple = get(attributes, [current, 'multiple'], false);
      const isRepeatable = get(attributes, [current, 'repeatable']);
      const isGroup = type === 'group';

      if (isGroup) {
        const group = get(attributes, [current, 'group']);

        return {
          ...acc,
          ...getMedia(groupLayouts[group], current, isGroup, isRepeatable),
        };
      }

      if (type === 'media') {
        const path = prefix !== '' ? `${prefix}.${current}` : current;

        acc[path] = { multiple, isGroup: isGroupType, repeatable };
      }

      return acc;
    }, {});
  };

  return getMedia(ctLayout);
};

const getFilesToUpload = (data, prefix = '') => {
  return Object.keys(data).reduce((acc, current) => {
    if (isObject(data[current]) && !isArray(data[current])) {
      return getFilesToUpload(data[current], current);
    }

    if (get(data, [current]) instanceof File) {
      const path = prefix !== '' ? `${prefix}.${current}` : current;

      acc[path] = data[current];
    }

    return acc;
  }, {});
};

const helperCleanData = (value, key) => {
  if (isArray(value)) {
    return value.map(obj => (obj[key] ? obj[key] : obj));
  } else if (isObject(value)) {
    return value[key];
  } else {
    return value;
  }
};

const cleanData = (retrievedData, ctLayout, groupLayouts) => {
  const getType = (schema, attrName) =>
    get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) =>
    get(schema, ['attributes', ...arr], '');

  const recursiveCleanData = (data, layout) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(layout.schema, current);
      const value = get(data, current);
      const group = getOtherInfos(layout.schema, [current, 'group']);
      const isRepeatable = getOtherInfos(layout.schema, [
        current,
        'repeatable',
      ]);
      let cleanedData;

      switch (attrType) {
        case 'json':
          cleanedData = value;
          break;
        case 'date':
          cleanedData =
            value && value._isAMomentObject === true
              ? value.toISOString()
              : value;
          break;
        case 'media':
          if (getOtherInfos(layout.schema, [current, 'multiple'])) {
            console.log({ value });
            cleanedData = value
              ? value.filter(file => !(file instanceof File))
              : null;
          } else {
            cleanedData =
              get(value, 0) instanceof File ? '' : get(value, 'id', null);
          }
          break;
        case 'group':
          if (isRepeatable) {
            cleanedData = value
              ? value.map(data => {
                  delete data._temp__id;
                  const subCleanedData = recursiveCleanData(
                    data,
                    groupLayouts[group]
                  );

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = recursiveCleanData(value, groupLayouts[group]);
          }
          break;
        default:
          cleanedData = helperCleanData(value, 'id');
      }

      acc[current] = cleanedData;

      return acc;
    }, {});
  };

  return recursiveCleanData(retrievedData, ctLayout);
};

const associateFilesToData = (data, filesMap, uploadedFiles) => {
  console.log({ uploadedFiles, filesMap, data });
  const ret = cloneDeep(data);

  Object.keys(uploadedFiles).forEach(key => {
    const keys = key.split('.');
    const filesMapKey =
      keys.length > 2
        ? [keys[0], keys[2]]
        : [keys[0], keys[1]].filter(k => !!k);
    const isMultiple = get(filesMap, [...filesMapKey, 'multiple'], false);
    const cleanedValue = get(uploadedFiles, key, []).map(v =>
      helperCleanData(v, 'id')
    );

    if (isMultiple) {
      const previousFiles = get(data, key, []);
      set(ret, key, [...previousFiles, ...cleanedValue]);
    } else {
      unset(ret, key);
      set(ret, key, cleanedValue[0] || null);
    }
  });

  return ret;
};

export default createYupSchema;
export {
  associateFilesToData,
  getMediaAttributes,
  getFilesToUpload,
  cleanData,
};
