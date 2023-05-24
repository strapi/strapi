'use strict';

const { yup, startsWithANumber } = require('@strapi/utils');
const _ = require('lodash');

const validators = {
  required: yup.boolean(),
  unique: yup.boolean(),
  minLength: yup.number().integer().positive(),
  maxLength: yup.number().integer().positive(),
};

const NAME_REGEX = /^[A-Za-z][_0-9A-Za-z]*$/;
const COLLECTION_NAME_REGEX = /^[A-Za-z][-_0-9A-Za-z]*$/;
const CATEGORY_NAME_REGEX = /^[A-Za-z][-_0-9A-Za-z]*$/;
const ICON_REGEX = /^[a-z][a-zA-Z0-9]*([A-Z][a-zA-Z0-9]*)*$/;
const UID_REGEX = /^[A-Za-z0-9-_.~]*$/;

const isValidName = {
  name: 'isValidName',
  message: `\${path} must match the following regex: ${NAME_REGEX}`,
  test: (val) => val === '' || NAME_REGEX.test(val),
};

const isValidIcon = {
  name: 'isValidIcon',
  message: `\${path} must match the following regex: ${ICON_REGEX}`,
  test: (val) => val === '' || ICON_REGEX.test(val),
};

const isValidUID = {
  name: 'isValidUID',
  message: `\${path} must match the following regex: ${UID_REGEX}`,
  test: (val) => val === '' || UID_REGEX.test(val),
};

const isValidCategoryName = {
  name: 'isValidCategoryName',
  message: `\${path} must match the following regex: ${CATEGORY_NAME_REGEX}`,
  test: (val) => val === '' || CATEGORY_NAME_REGEX.test(val),
};

const isValidCollectionName = {
  name: 'isValidCollectionName',
  message: `\${path} must match the following regex: ${COLLECTION_NAME_REGEX}`,
  test: (val) => val === '' || COLLECTION_NAME_REGEX.test(val),
};

const isValidKey = (key) => ({
  name: 'isValidKey',
  message: `Attribute name '${key}' must match the following regex: ${NAME_REGEX}`,
  test: () => NAME_REGEX.test(key),
});

const isValidEnum = {
  name: 'isValidEnum',
  message: '${path} should not start with number',
  test: (val) => val === '' || !startsWithANumber(val),
};

const areEnumValuesUnique = {
  name: 'areEnumValuesUnique',
  message: '${path} cannot contain duplicate values',
  test(values) {
    const filtered = [...new Set(values)];

    return filtered.length === values.length;
  },
};

const isValidRegExpPattern = {
  name: 'isValidRegExpPattern',
  message: '${path} must be a valid RexExp pattern string',
  test: (val) => val === '' || new RegExp(val),
};

const isValidDefaultJSON = {
  name: 'isValidDefaultJSON',
  message: '${path} is not a valid JSON',
  test(val) {
    if (val === undefined) {
      return true;
    }

    if (_.isNumber(val) || _.isNull(val) || _.isObject(val) || _.isArray(val)) {
      return true;
    }

    try {
      JSON.parse(val);

      return true;
    } catch (err) {
      return false;
    }
  },
};

module.exports = {
  validators,
  areEnumValuesUnique,
  isValidCollectionName,
  isValidCategoryName,
  isValidDefaultJSON,
  isValidName,
  isValidIcon,
  isValidKey,
  isValidEnum,
  isValidUID,
  isValidRegExpPattern,
};
