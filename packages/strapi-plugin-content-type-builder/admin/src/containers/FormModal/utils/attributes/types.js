import * as yup from 'yup';
// import { get } from 'lodash';
// import { isEmpty } from 'lodash';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import getTrad from '../../../../utils/getTrad';
import {
  alreadyUsedAttributeNames,
  createTextShape,
  getUsedContentTypeAttributeNames,
  isMinSuperiorThanMax,
  isNameAllowed,
  validators,
  NAME_REGEX,
} from './validation/common';

const types = {
  date: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
    };

    return yup.object(shape);
  },
  datetime: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
    };

    return yup.object(shape);
  },
  time: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
    };

    return yup.object(shape);
  },
  default: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
    };

    return yup.object(shape);
  },
  biginteger: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: yup
        .string()
        .nullable()
        .matches(/^\d*$/),
      unique: validators.unique(),
      required: validators.required(),

      max: yup
        .string()
        .nullable()
        .matches(/^\d*$/, errorsTrads.regex),
      min: yup
        .string()
        .nullable()
        .test(isMinSuperiorThanMax)
        .matches(/^\d*$/, errorsTrads.regex),
    };

    return yup.object(shape);
  },
  boolean: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      default: yup.boolean().nullable(),
      required: validators.required(),
      unique: validators.unique(),
    };

    return yup.object(shape);
  },
  component: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      required: validators.required(),
      max: validators.max(),
      min: validators.min(),
      component: yup.string().required(errorsTrads.required),
    };

    return yup.object(shape);
  },
  decimal: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: yup.number(),
      required: validators.required(),
      max: yup.number(),
      min: yup.number().test(isMinSuperiorThanMax),
    };

    return yup.object(shape);
  },
  dynamiczone: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      required: validators.required(),
      max: validators.max(),
      min: validators.min(),
    };

    return yup.object(shape);
  },
  email: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: yup
        .string()
        .email()
        .nullable(),
      unique: validators.unique(),
      required: validators.required(),
      maxLength: validators.maxLength(),
      minLength: validators.minLength(),
    };

    return yup.object(shape);
  },
  enumeration: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const usedNames = getUsedContentTypeAttributeNames(
      contentTypeSchema,
      isEdition,
      initialData.name
    );

    const ENUM_REGEX = new RegExp('^[_A-Za-z][_0-9A-Za-z]*$');

    const shape = {
      name: yup
        .string()
        .test(alreadyUsedAttributeNames(usedNames))
        .test(isNameAllowed(reservedNames))
        .matches(ENUM_REGEX, errorsTrads.regex)
        .required(errorsTrads.required),
      type: validators.type(),
      default: validators.default(),
      unique: validators.unique(),
      required: validators.required(),
      enum: yup
        .array()
        .of(yup.string())
        .min(1, errorsTrads.min)
        .test({
          name: 'areEnumValuesUnique',
          message: getTrad('error.validation.enum-duplicate'),
          test: values => {
            const filtered = [...new Set(values)];

            return filtered.length === values.length;
          },
        })
        .test({
          name: 'valuesMatchesRegex',
          message: errorsTrads.regex,
          test: values => {
            return values.every(val => val === '' || ENUM_REGEX.test(val));
          },
        })
        .test({
          name: 'doesNotHaveEmptyValues',
          message: getTrad('error.validation.enum-empty-string'),
          test: values => !values.some(val => val === ''),
        }),
      enumName: yup.string().nullable(),
    };

    return yup.object(shape);
  },
  float: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      required: validators.required(),
      default: yup.number(),
      max: yup.number(),
      min: yup.number().test(isMinSuperiorThanMax),
    };

    return yup.object(shape);
  },
  integer: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: yup.number().integer(),
      unique: validators.unique(),
      required: validators.required(),
      max: validators.max(),
      min: validators.min(),
    };

    return yup.object(shape);
  },
  json: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      required: validators.required(),
      unique: validators.unique(),
    };

    return yup.object(shape);
  },
  media: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      multiple: yup.boolean(),
      required: validators.required(),
      allowedTypes: yup
        .array()
        .of(yup.string().oneOf(['images', 'videos', 'files']))
        .min(1)
        .nullable(),
    };

    return yup.object(shape);
  },
  password: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: validators.default(),
      unique: validators.unique(),
      required: validators.required(),
      maxLength: validators.maxLength(),
      minLength: validators.minLength(),
    };

    return yup.object(shape);
  },
  relation: (
    contentTypeSchema,
    initialData,
    isEdition,
    reservedNames,
    data,
    alreadyTakenTargetAttributes
  ) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      target: yup.string().required(errorsTrads.required),
      nature: yup.string().required(),
      dominant: yup.boolean().nullable(),
      unique: yup.boolean().nullable(),
      targetAttribute: yup.lazy(() => {
        let schema = yup.string().test(isNameAllowed(reservedNames));
        const initialForbiddenName = [...alreadyTakenTargetAttributes, data.name];

        let forbiddenTargetAttributeName = isEdition
          ? initialForbiddenName.filter(val => val !== initialData.targetAttribute)
          : initialForbiddenName;

        if (!['oneWay', 'manyWay'].includes(data.nature)) {
          schema = schema.matches(NAME_REGEX, errorsTrads.regex);
        }

        return schema
          .test({
            name: 'forbiddenTargetAttributeName',
            message: getTrad('error.validation.relation.targetAttribute-taken'),
            test: value => {
              if (!value) {
                return false;
              }

              return !forbiddenTargetAttributeName.includes(value);
            },
          })
          .required(errorsTrads.required);
      }),
    };

    return yup.object(shape);
  },
  richtext: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = {
      name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
      type: validators.type(),
      default: validators.default(),
      unique: validators.unique(),
      required: validators.required(),
      maxLength: validators.maxLength(),
      minLength: validators.minLength(),
    };

    return yup.object(shape);
  },
  string: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = createTextShape(contentTypeSchema, initialData, isEdition, reservedNames);

    return yup.object(shape);
  },
  text: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = createTextShape(contentTypeSchema, initialData, isEdition, reservedNames);

    return yup.object(shape);
  },
  uid: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const shape = createTextShape(contentTypeSchema, initialData, isEdition, reservedNames);

    return yup.object(shape);
  },
};

export default types;
