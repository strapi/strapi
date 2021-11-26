'use strict';

const _ = require('lodash');

const { yup } = require('@strapi/utils');

/**
 * Utility function to compose validators
 */
const composeValidators = (...fns) => (...args) => {
  let validator = yup.mixed();

  // if we receive a schema then use it as base schema for nested composition
  if (yup.isSchema(args[0])) {
    validator = args[0];
    args = args.slice(1);
  }

  return fns.reduce((validator, fn) => fn(validator, ...args), validator);
};

/* Validator utils */

/**
 * Adds minLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinLengthValidator = (validator, { minLength }, { isDraft }) =>
  _.isInteger(minLength) && !isDraft ? validator.min(minLength) : validator;

/**
 * Adds maxLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxLengthValidator = (validator, { maxLength }) =>
  _.isInteger(maxLength) ? validator.max(maxLength) : validator;

/**
 * Adds min integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinIntegerValidator = (validator, { min }) =>
  _.isNumber(min) ? validator.min(_.toInteger(min)) : validator;

/**
 * Adds max integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxIntegerValidator = (validator, { max }) =>
  _.isNumber(max) ? validator.max(_.toInteger(max)) : validator;

/**
 * Adds min float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinFloatValidator = (validator, { min }) =>
  _.isNumber(min) ? validator.min(min) : validator;

/**
 * Adds max float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxFloatValidator = (validator, { max }) =>
  _.isNumber(max) ? validator.max(max) : validator;

/**
 * Adds regex validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addStringRegexValidator = (validator, { regex }) =>
  _.isUndefined(regex) ? validator : validator.matches(new RegExp(regex));

const addUniqueValidator = (validator, attr, __, model, updatedAttribute, entity) => {
  if (!attr.unique && attr.type !== 'uid') {
    return validator;
  }

  /**
   * If the attribute value is `null` we want to skip the unique validation.
   * Otherwise it'll only accept a single `null` entry in the database.
   */
  if (updatedAttribute.value === null) {
    return validator;
  }

  /**
   * If the attribute is unchanged we skip the unique verification. This will
   * prevent the validator to be triggered in case the user activated the
   * unique constraint after already creating multiple entries with
   * the same attribute value for that field.
   */
  if (entity && updatedAttribute.value === entity[updatedAttribute.name]) {
    return validator;
  }

  return validator.test('unique', 'This attribute must be unique', async value => {
    let whereParams = entity
      ? { $and: [{ [updatedAttribute.name]: value }, { $not: { id: entity.id } }] }
      : { [updatedAttribute.name]: value };

    const record = await strapi.db.query(model.uid).findOne({
      select: ['id'],
      where: whereParams,
    });

    return !record;
  });
};

/* Type validators */

const stringValidator = composeValidators(
  () => yup.string().transform((val, originalVal) => originalVal),
  addMinLengthValidator,
  addMaxLengthValidator,
  addStringRegexValidator,
  addUniqueValidator
);

const emailValidator = composeValidators(stringValidator, validator => validator.email());

const uidValidator = composeValidators(stringValidator, validator =>
  validator.matches(new RegExp('^[A-Za-z0-9-_.~]*$'))
);

const enumerationValidator = attr => {
  return yup.string().oneOf((Array.isArray(attr.enum) ? attr.enum : [attr.enum]).concat(null));
};

const integerValidator = composeValidators(
  () => yup.number().integer(),
  addMinIntegerValidator,
  addMaxIntegerValidator,
  addUniqueValidator
);

const floatValidator = composeValidators(
  () => yup.number(),
  addMinFloatValidator,
  addMaxFloatValidator,
  addUniqueValidator
);

module.exports = {
  string: stringValidator,
  text: stringValidator,
  richtext: stringValidator,
  password: stringValidator,
  email: emailValidator,
  enumeration: enumerationValidator,
  boolean: () => yup.boolean(),
  uid: uidValidator,
  json: () => yup.mixed(),
  integer: integerValidator,
  biginteger: composeValidators(addUniqueValidator),
  float: floatValidator,
  decimal: floatValidator,
  date: composeValidators(addUniqueValidator),
  time: composeValidators(addUniqueValidator),
  datetime: composeValidators(addUniqueValidator),
  timestamp: composeValidators(addUniqueValidator),
};
