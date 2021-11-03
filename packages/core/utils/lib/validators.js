'use strict';

const yup = require('yup');
const _ = require('lodash');
const { defaults } = require('lodash/fp');
const utils = require('./string-formatting');
const { YupValidationError } = require('./errors');

const MixedSchemaType = yup.mixed;

const isNotNilTest = value => !_.isNil(value);

function isNotNill(msg = '${path} must be defined.') {
  return this.test('defined', msg, isNotNilTest);
}

const isNotNullTest = value => !_.isNull(value);
function isNotNull(msg = '${path} cannot be null.') {
  return this.test('defined', msg, isNotNullTest);
}

function isFunction(message = '${path} is not a function') {
  return this.test('is a function', message, value => _.isUndefined(value) || _.isFunction(value));
}

function isCamelCase(message = '${path} is not in camel case (anExampleOfCamelCase)') {
  return this.test('is in camelCase', message, value => utils.isCamelCase(value));
}

function isKebabCase(message = '${path} is not in kebab case (an-example-of-kebab-case)') {
  return this.test('is in kebab-case', message, value => utils.isKebabCase(value));
}

function onlyContainsFunctions(message = '${path} contains values that are not functions') {
  return this.test(
    'only contains functions',
    message,
    value => _.isUndefined(value) || (value && Object.values(value).every(_.isFunction))
  );
}

yup.addMethod(yup.mixed, 'notNil', isNotNill);
yup.addMethod(yup.mixed, 'notNull', isNotNull);
yup.addMethod(yup.mixed, 'isFunction', isFunction);
yup.addMethod(yup.string, 'isCamelCase', isCamelCase);
yup.addMethod(yup.string, 'isKebabCase', isKebabCase);
yup.addMethod(yup.object, 'onlyContainsFunctions', onlyContainsFunctions);

class StrapiIDSchema extends MixedSchemaType {
  constructor() {
    super({ type: 'strapiID' });
  }

  _typeCheck(value) {
    return typeof value === 'string' || (Number.isInteger(value) && value >= 0);
  }
}

yup.strapiID = () => new StrapiIDSchema();

const handleYupError = (error, errorMessage) => {
  throw new YupValidationError(error, errorMessage);
};

const defaultValidationParam = { strict: true, abortEarly: false };

const validateYupSchema = (schema, options = {}) => async (body, errorMessage) => {
  try {
    const optionsWithDefaults = defaults(defaultValidationParam, options);
    return await schema.validate(body, optionsWithDefaults);
  } catch (e) {
    handleYupError(e, errorMessage);
  }
};

const validateYupSchemaSync = (schema, options = {}) => (body, errorMessage) => {
  try {
    const optionsWithDefaults = defaults(defaultValidationParam, options);
    return schema.validateSync(body, optionsWithDefaults);
  } catch (e) {
    handleYupError(e, errorMessage);
  }
};

module.exports = {
  yup,
  handleYupError,
  validateYupSchema,
  validateYupSchemaSync,
};
