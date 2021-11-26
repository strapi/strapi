'use strict';

const _ = require('lodash');

const { yup } = require('@strapi/utils');

/**
 * Utility function to compose validators
 */
const composeValidators = (...fns) => (attr, { isDraft, model, attributeName, entity, data }) => {
  return fns.reduce((validator, fn) => {
    return fn(attr, { isDraft, model, attributeName, entity, data }, validator);
  }, yup.mixed());
};

/* Validator utils */

/**
 * Adds minLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinLengthValidator = ({ minLength }, { isDraft }, validator) =>
  _.isInteger(minLength) && !isDraft ? validator.min(minLength) : validator;

/**
 * Adds maxLength validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxLengthValidator = ({ maxLength }, __, validator) =>
  _.isInteger(maxLength) ? validator.max(maxLength) : validator;

/**
 * Adds min integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinIntegerValidator = ({ min }, __, validator) =>
  _.isNumber(min) ? validator.min(_.toInteger(min)) : validator;

/**
 * Adds max integer validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxIntegerValidator = ({ max }, __, validator) =>
  _.isNumber(max) ? validator.max(_.toInteger(max)) : validator;

/**
 * Adds min float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMinFloatValidator = ({ min }, __, validator) =>
  _.isNumber(min) ? validator.min(min) : validator;

/**
 * Adds max float/decimal validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addMaxFloatValidator = ({ max }, __, validator) =>
  _.isNumber(max) ? validator.max(max) : validator;

/**
 * Adds regex validator
 * @param {Object} attribute model attribute
 * @param {Object} validator yup validator
 */
const addStringRegexValidator = ({ regex }, __, validator) =>
  _.isUndefined(regex) ? validator : validator.matches(new RegExp(regex));

const addUniqueValidator = (attr, { model, attributeName, entity, data }, validator) => {
  /**
   * If the attribute value is `null` we want to skip the unique validation.
   * Otherwise it'll only accept a single `null` entry in the database.
   */
  if (data === null) {
    return validator;
  }

  /**
   * If the attribute is unchanged we skip the unique verification. This will
   * prevent the validator to be triggered in case the user activated the
   * unique constraint after already creating multiple entries with
   * the same attribute value for that field.
   */
  if (entity && data === entity[attributeName]) {
    return validator;
  }

  if (attr.unique || attr.type === 'uid') {
    return validator.test('unique', 'This attribute must be unique', async value => {
      let whereParams = entity
        ? { $and: [{ [attributeName]: value }, { $not: { id: entity.id } }] }
        : { [attributeName]: value };

      const record = await strapi.db.query(model.uid).findOne({
        select: ['id'],
        where: whereParams,
      });

      return !record;
    });
  }

  return validator;
};

/* Type validators */

const stringValidator = composeValidators(
  () => yup.string().transform((val, originalVal) => originalVal),
  addMinLengthValidator,
  addMaxLengthValidator,
  addStringRegexValidator,
  addUniqueValidator
);

const emailValidator = composeValidators(stringValidator, (attr, __, validator) =>
  validator.email()
);

const uidValidator = composeValidators(stringValidator, (attr, __, validator) =>
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
  biginteger: composeValidators(() => yup.mixed(), addUniqueValidator),
  float: floatValidator,
  decimal: floatValidator,
  date: composeValidators(() => yup.mixed(), addUniqueValidator),
  time: composeValidators(() => yup.mixed(), addUniqueValidator),
  datetime: composeValidators(() => yup.mixed(), addUniqueValidator),
  timestamp: composeValidators(() => yup.mixed(), addUniqueValidator),
};
