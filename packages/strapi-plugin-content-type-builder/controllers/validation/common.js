'use strict';

const yup = require('yup');

const validators = {
  required: yup.boolean(),
  unique: yup.boolean(),
  minLength: yup
    .number()
    .integer()
    .positive(),
  maxLength: yup
    .number()
    .integer()
    .positive(),
};

const NAME_REGEX = new RegExp('^[A-Za-z][_0-9A-Za-z]*$');
const ENUM_REGEX = new RegExp('^[_A-Za-z][_0-9A-Za-z]*$');

const isValidName = {
  name: 'isValidName',
  message: '${path} must match the following regex: /^[A-Za-z][_0-9A-Za-z]*$/^',
  test: val => val === '' || NAME_REGEX.test(val),
};

const isValidKey = key => ({
  name: 'isValidKey',
  message: `Attribute name '${key}' must match the following regex: /^[A-Za-z][_0-9A-Za-z]*$/^`,
  test: () => NAME_REGEX.test(key),
});

const isValidEnum = {
  name: 'isValidEnum',
  message:
    '${path} must match the following regex: /^[_A-Za-z][_0-9A-Za-z]*$/^',
  test: val => val === '' || ENUM_REGEX.test(val),
};

module.exports = {
  validators,

  isValidName,
  isValidKey,
  isValidEnum,
};
