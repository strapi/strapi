'use strict';

const _ = require('lodash');

const { yup } = require('@strapi/utils');

/**
 * @type {import('yup').StringSchema} StringSchema
 * @type {import('yup').NumberSchema} NumberSchema
 * @type {import('yup').AnySchema} AnySchema
 */

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
 * @param {StringSchema} validator yup validator
 * @param {Object} metas
 * @param {{ minLength: Number }} metas.attr model attribute
 * @param {Object} options
 * @param {boolean} options.isDraft
 *
 * @returns {StringSchema}
 */
const addMinLengthValidator = (validator, { attr }, { isDraft }) =>
  _.isInteger(attr.minLength) && !isDraft ? validator.min(attr.minLength) : validator;

/**
 * Adds maxLength validator
 * @param {StringSchema} validator yup validator
 * @param {Object} metas
 * @param {{ maxLength: Number }} metas.attr model attribute
 *
 * @returns {StringSchema}
 */
const addMaxLengthValidator = (validator, { attr }) =>
  _.isInteger(attr.maxLength) ? validator.max(attr.maxLength) : validator;

/**
 * Adds min integer validator
 * @param {NumberSchema} validator yup validator
 * @param {Object} metas
 * @param {{ min: Number }} metas.attr model attribute
 *
 * @returns {NumberSchema}
 */
const addMinIntegerValidator = (validator, { attr }) =>
  _.isNumber(attr.min) ? validator.min(_.toInteger(attr.min)) : validator;

/**
 * Adds max integer validator
 * @param {NumberSchema} validator yup validator
 * @param {Object} metas
 * @param {{ max: Number }} metas.attr model attribute
 *
 * @returns {NumberSchema}
 */
const addMaxIntegerValidator = (validator, { attr }) =>
  _.isNumber(attr.max) ? validator.max(_.toInteger(attr.max)) : validator;

/**
 * Adds min float/decimal validator
 * @param {NumberSchema} validator yup validator
 * @param {Object} metas
 * @param {{ min: Number }} metas.attr model attribute
 *
 * @returns {NumberSchema}
 */
const addMinFloatValidator = (validator, { attr }) =>
  _.isNumber(attr.min) ? validator.min(attr.min) : validator;

/**
 * Adds max float/decimal validator
 * @param {NumberSchema} validator yup validator
 * @param {Object} metas model attribute
 * @param {{ max: Number }} metas.attr
 *
 * @returns {NumberSchema}
 */
const addMaxFloatValidator = (validator, { attr }) =>
  _.isNumber(attr.max) ? validator.max(attr.max) : validator;

/**
 * Adds regex validator
 * @param {StringSchema} validator yup validator
 * @param {Object} metas model attribute
 * @param {{ regex: RegExp }} metas.attr
 *
 * @returns {StringSchema}
 */
const addStringRegexValidator = (validator, { attr }) =>
  _.isUndefined(attr.regex)
    ? validator
    : validator.matches(new RegExp(attr.regex), { excludeEmptyString: !attr.required });

/**
 *
 * @param {AnySchema} validator
 * @param {Object} metas
 * @param {{ unique: Boolean, type: String }} metas.attr
 * @param {{ uid: String }} metas.model
 * @param {{ name: String, value: any }} metas.updatedAttribute
 * @param {Object} metas.entity
 *
 * @returns {AnySchema}
 */
const addUniqueValidator = (validator, { attr, model, updatedAttribute, entity }) => {
  if (!attr.unique && attr.type !== 'uid') {
    return validator;
  }

  return validator.test('unique', 'This attribute must be unique', async value => {
    /**
     * If the attribute value is `null` we want to skip the unique validation.
     * Otherwise it'll only accept a single `null` entry in the database.
     */
    if (_.isNil(updatedAttribute.value)) {
      return true;
    }

    /**
     * If the attribute is unchanged we skip the unique verification. This will
     * prevent the validator to be triggered in case the user activated the
     * unique constraint after already creating multiple entries with
     * the same attribute value for that field.
     */
    if (entity && updatedAttribute.value === entity[updatedAttribute.name]) {
      return true;
    }

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

const enumerationValidator = ({ attr }) => {
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
