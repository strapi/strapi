'use strict';

const yup = require('yup');

const VALID_TYPES = [
  // advanced types
  'media',

  // scalar types
  'string',
  'text',
  'richtext',
  'json',
  'enumeration',
  'password',
  'email',
  'integer',
  'float',
  'decimal',
  'date',
  'boolean',
];

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

const isValidName = {
  name: 'isValidName',
  message: '${path} must match the following regex: /^[_A-Za-z][_0-9A-Za-z]*/^',
  test: val => NAME_REGEX.test(val),
};

const isValidKey = key => ({
  name: 'isValidKey',
  message: `Attribute name '${key}' must match the following regex: /^[_A-Za-z][_0-9A-Za-z]*/^`,
  test: () => NAME_REGEX.test(key),
});

module.exports = {
  validators,

  isValidName,
  isValidKey,

  VALID_TYPES,
};
