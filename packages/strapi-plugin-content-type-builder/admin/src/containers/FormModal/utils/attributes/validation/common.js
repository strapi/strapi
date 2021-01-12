import * as yup from 'yup';
import { get, toNumber } from 'lodash';
import { translatedErrors as errorsTrads } from 'strapi-helper-plugin';
import getTrad from '../../../../../utils/getTrad';

const NAME_REGEX = new RegExp('^[A-Za-z][_0-9A-Za-z]*$');

const alreadyUsedAttributeNames = usedNames => {
  return {
    name: 'attributeNameAlreadyUsed',
    message: errorsTrads.unique,
    test: value => {
      if (!value) {
        return false;
      }

      return !usedNames.includes(value);
    },
  };
};

const getUsedContentTypeAttributeNames = (ctShema, isEdition, attributeNameToEdit) => {
  const attributes = get(ctShema, ['schema', 'attributes'], {});

  return Object.keys(attributes).filter(attr => {
    if (isEdition) {
      return attr !== attributeNameToEdit;
    }

    return true;
  });
};

const isNameAllowed = reservedNames => {
  return {
    name: 'forbiddenAttributeName',
    message: getTrad('error.attributeName.reserved-name'),
    test: value => {
      if (!value) {
        return false;
      }

      return !reservedNames.includes(value);
    },
  };
};

const validators = {
  default: () => yup.string().nullable(),
  max: () =>
    yup
      .number()
      .integer()
      .positive()
      .nullable(),
  min: () =>
    yup
      .number()
      .integer()
      .positive()
      .when('max', (max, schema) => {
        if (max) {
          return schema.max(max, getTrad('error.validation.minSupMax'));
        }

        return schema;
      })
      .nullable(),
  maxLength: () =>
    yup
      .number()
      .integer()
      .nullable(),
  minLength: () =>
    yup
      .number()
      .integer()
      .when('maxLength', (maxLength, schema) => {
        if (maxLength) {
          return schema.max(maxLength, getTrad('error.validation.minSupMax'));
        }

        return schema;
      })
      .nullable(),
  name: (contentTypeSchema, initialData, isEdition, reservedNames) => {
    const usedNames = getUsedContentTypeAttributeNames(
      contentTypeSchema,
      isEdition,
      initialData.name
    );

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

const createTextShape = (contentTypeSchema, initialData, isEdition, reservedNames) => {
  const shape = {
    name: validators.name(contentTypeSchema, initialData, isEdition, reservedNames),
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
        test: value => {
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
  test(value) {
    if (!value) {
      return false;
    }

    const { max } = this.parent;

    if (!max) {
      return false;
    }

    if (Number.isNaN(toNumber(value))) {
      return true;
    }

    return toNumber(max) >= toNumber(value);
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
