import { translatedErrors as errorsTrads } from '@strapi/admin/strapi-admin';
import { snakeCase } from 'lodash/fp';
import toNumber from 'lodash/toNumber';
import * as yup from 'yup';

import { getTrad } from '../../../../utils/getTrad';

const NAME_REGEX = /^[A-Za-z][_0-9A-Za-z]*$/;

const alreadyUsedAttributeNames = (
  usedNames: Array<string>
): yup.TestConfig<string | undefined, Record<string, unknown>> => {
  return {
    name: 'attributeNameAlreadyUsed',
    message: errorsTrads.unique.id,
    test(value: string | undefined) {
      if (!value) {
        return false;
      }
      const snakeCaseKey = snakeCase(value);

      return !usedNames.some((existingKey) => {
        return snakeCase(existingKey) === snakeCaseKey;
      });
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

const isNameAllowed = (
  reservedNames: Array<string>
): yup.TestConfig<string | undefined, Record<string, unknown>> => {
  return {
    name: 'forbiddenAttributeName',
    message: getTrad('error.attributeName.reserved-name'),
    test(value: string | undefined) {
      if (!value) {
        return false;
      }
      const snakeCaseKey = snakeCase(value);

      return !reservedNames.some((existingKey) => {
        return snakeCase(existingKey) === snakeCaseKey;
      });
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
      .min(1)
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
      .matches(NAME_REGEX, errorsTrads.regex.id)
      .required(errorsTrads.required.id);
  },
  required: () => yup.boolean(),
  type: () => yup.string().required(errorsTrads.required.id),
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
          try {
            return new RegExp(value || '') !== null;
          } catch (e) {
            return false;
          }
        },
      })
      .nullable(),
  };

  return shape;
};

type GenericIsMinSuperiorThanMax<T extends (string | null) | number> = yup.TestConfig<
  T | undefined,
  Record<string, unknown>
>;

const isMinSuperiorThanMax = <
  T extends (string | null) | number,
>(): GenericIsMinSuperiorThanMax<T> => ({
  name: 'isMinSuperiorThanMax',
  message: getTrad('error.validation.minSupMax'),
  test(min: T | undefined) {
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
});

export {
  alreadyUsedAttributeNames,
  createTextShape,
  getUsedContentTypeAttributeNames,
  isMinSuperiorThanMax,
  isNameAllowed,
  NAME_REGEX,
  validators,
};
