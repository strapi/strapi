import { translatedErrors as errorsTrads } from '@strapi/helper-plugin';
import toNumber from 'lodash/toNumber';
import * as yup from 'yup';

import { getTrad } from '../../../../utils/getTrad';

const NAME_REGEX = /^[A-Za-z][_0-9A-Za-z]*$/;

const alreadyUsedAttributeNames = (usedNames: Array<string>) => {
  return {
    name: 'attributeNameAlreadyUsed',
    message: errorsTrads.unique,
    test(value: unknown) {
      if (!value) {
        return false;
      }

      return !usedNames.includes(value);
    },
  };
};

const getUsedContentTypeAttributeNames = (
  ctShema: any,
  isEdition: boolean,
  attributeNameToEdit: string
) => {
  const attributes = ctShema?.schema?.attributes ?? {};

  return Object.keys(attributes).filter((attr) => {
    if (isEdition) {
      return attr !== attributeNameToEdit;
    }

    return true;
  });
};

const isNameAllowed = (reservedNames: Array<string>) => {
  return {
    name: 'forbiddenAttributeName',
    message: getTrad('error.attributeName.reserved-name'),
    test(value: string) {
      if (!value) {
        return false;
      }

      return !reservedNames.includes(value);
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
  name(usedNames: Array<string>, reservedNames: Array<string>) {
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

const createTextShape = (usedAttributeNames: Array<string>, reservedNames: Array<string>) => {
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
          if (!value) {
            return false;
          }
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
  test(min: string) {
    if (!min) {
      return true;
    }

    const { max } = (this as any).parent;

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
  NAME_REGEX,
  validators,
};
