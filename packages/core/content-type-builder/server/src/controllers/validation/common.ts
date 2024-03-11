/* eslint-disable no-template-curly-in-string */
import { yup, strings } from '@strapi/utils';
import _ from 'lodash';
import { TestConfig } from 'yup';

export const validators = {
  required: yup.boolean(),
  unique: yup.boolean(),
  minLength: yup.number().integer().positive(),
  maxLength: yup.number().integer().positive(),
};

export const NAME_REGEX = /^[A-Za-z][_0-9A-Za-z]*$/;
export const COLLECTION_NAME_REGEX = /^[A-Za-z][-_0-9A-Za-z]*$/;
export const CATEGORY_NAME_REGEX = /^[A-Za-z][-_0-9A-Za-z]*$/;
export const ICON_REGEX = /^[A-Za-z0-9][-A-Za-z0-9]*$/;
export const UID_REGEX = /^[A-Za-z0-9-_.~]*$/;

export type CommonTestConfig = TestConfig<unknown | undefined, Record<string, unknown>>;

export const isValidName: CommonTestConfig = {
  name: 'isValidName',
  message: `\${path} must match the following regex: ${NAME_REGEX}`,
  test: (val: unknown) => val === '' || NAME_REGEX.test(val as string),
};

export const isValidIcon: CommonTestConfig = {
  name: 'isValidIcon',
  message: `\${path} is not a valid icon name. Make sure your icon name starts with an alphanumeric character and only includes alphanumeric characters or dashes.`,
  test: (val) => val === '' || ICON_REGEX.test(val as string),
};

export const isValidUID: CommonTestConfig = {
  name: 'isValidUID',
  message: `\${path} must match the following regex: ${UID_REGEX}`,
  test: (val) => val === '' || UID_REGEX.test(val as string),
};

export const isValidCategoryName: CommonTestConfig = {
  name: 'isValidCategoryName',
  message: `\${path} must match the following regex: ${CATEGORY_NAME_REGEX}`,
  test: (val) => val === '' || CATEGORY_NAME_REGEX.test(val as string),
};

export const isValidCollectionName: CommonTestConfig = {
  name: 'isValidCollectionName',
  message: `\${path} must match the following regex: ${COLLECTION_NAME_REGEX}`,
  test: (val) => val === '' || COLLECTION_NAME_REGEX.test(val as string),
};

export const isValidKey = (key: string): CommonTestConfig => ({
  name: 'isValidKey',
  message: `Attribute name '${key}' must match the following regex: ${NAME_REGEX}`,
  test: () => NAME_REGEX.test(key),
});

export const isValidEnum: CommonTestConfig = {
  name: 'isValidEnum',
  message: '${path} should not start with number',
  test: (val) => val === '' || !strings.startsWithANumber(val as string),
};

export const areEnumValuesUnique: CommonTestConfig = {
  name: 'areEnumValuesUnique',
  message: '${path} cannot contain duplicate values',
  test(values) {
    const filtered = [...new Set(values as string[])];

    return filtered.length === (values as string[]).length;
  },
};

export const isValidRegExpPattern: CommonTestConfig = {
  name: 'isValidRegExpPattern',
  message: '${path} must be a valid RexExp pattern string',
  test: (val) => val === '' || !!new RegExp(val as string),
};

export const isValidDefaultJSON: CommonTestConfig = {
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
      JSON.parse(val as string);

      return true;
    } catch (err) {
      return false;
    }
  },
};
