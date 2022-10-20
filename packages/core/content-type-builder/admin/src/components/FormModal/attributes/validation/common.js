import * as yup from 'yup';
import { get, toNumber, toLower } from 'lodash';
import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import getTrad from '../../../../utils/getTrad';

const NAME_REGEX = /^[A-Za-z][_0-9A-Za-z]*$/;

const alreadyUsedAttributeNames = (usedNames) => {
  return {
    name: 'attributeNameAlreadyUsed',
    message: errorsTrads.unique,
    test(value) {
      if (!value) {
        return false;
      }

      return !usedNames.map(toLower).includes(toLower(value));
    },
  };
};

const getUsedContentTypeAttributeNames = (ctShema, isEdition, attributeNameToEdit) => {
  const attributes = get(ctShema, ['schema', 'attributes'], {});

  return Object.keys(attributes).filter((attr) => {
    if (isEdition) {
      return attr !== attributeNameToEdit;
    }

    return true;
  });
};

const isNameAllowed = (reservedNames) => {
  return {
    name: 'forbiddenAttributeName',
    message: getTrad('error.attributeName.reserved-name'),
    test(value) {
      if (!value) {
        return false;
      }

      let reservedName = false;
      for (let i = 0; i < reservedName.length; i++) {
        const name = reservedNames[i];

        if (toLower(name) === toLower(value)) {
          reservedName = true;
          break;
        }
      }

      return !reservedName;
    },
  };
};

const validators = {
  default: () => yup.string().nullable(),
  max: () => yup.number().integer().nullable(),
  min: () =>
    yup
      .number()
      .integer()
      .when('max', (max, schema) => {
        if (max) {
          return schema.max(max, getTrad('error.validation.minSupMax'));
        }

        return schema;
      })
      .nullable(),
  maxLength: () => yup.number().integer().positive(getTrad('error.validation.positive')).nullable(),
  minLength: () =>
    yup
      .number()
      .integer()
      .min(0)
      .when('maxLength', (maxLength, schema) => {
        if (maxLength) {
          return schema.max(maxLength, getTrad('error.validation.minSupMax'));
        }

        return schema;
      })
      .nullable(),
  name(usedNames, reservedNames) {
    return yup
      .string()
      .test(alreadyUsedAttributeNames(usedNames))
      .test(isNameAllowed(reservedNames))
      .matches(NAME_REGEX, errorsTrads.regex)
      .required(errorsTrads.required);
  },
  required: () => yup.boolean(),
  type: () => yup.string().required(errorsTrads.required),
  unique: () => yup.boolean().nullable(),
};

const createTextShape = (usedAttributeNames, reservedNames) => {
  const shape = {
    name: validators.name(usedAttributeNames, reservedNames),
    type: validators.type(),
    default: validators.default(),
    unique: validators.unique(),
    required: validators.required(),
    maxLength: validators.maxLength(),
    minLength: validators.minLength(),
    regex: yup
      .string()
      .test({
        name: 'isValidRegExpPattern',
        message: getTrad('error.validation.regex'),
        test(value) {
          return new RegExp(value) !== null;
        },
      })
      .nullable(),
  };

  return shape;
};

const isMinSuperiorThanMax = {
  name: 'isMinSuperiorThanMax',
  message: getTrad('error.validation.minSupMax'),
  test(min) {
    if (!min) {
      return true;
    }

    const { max } = this.parent;

    if (!max) {
      return true;
    }

    if (Number.isNaN(toNumber(min))) {
      return true;
    }

    return toNumber(max) >= toNumber(min);
  },
};

export {
  alreadyUsedAttributeNames,
  createTextShape,
  getUsedContentTypeAttributeNames,
  isMinSuperiorThanMax,
  isNameAllowed,
  validators,
  NAME_REGEX,
};
