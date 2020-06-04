'use strict';

const yup = require('yup');
const _ = require('lodash');

const MixedSchemaType = yup.mixed;

const isNotNilTest = value => !_.isNil(value);

function isNotNill(msg = '${path} must be defined.') {
  return this.test('defined', msg, isNotNilTest);
}

const isNotNullTest = value => !_.isNull(value);
function isNotNull(msg = '${path} cannot be null.') {
  return this.test('defined', msg, isNotNullTest);
}

function arrayRequiredAllowEmpty(message) {
  return this.test('field is required', message || '', value => _.isArray(value));
}

function isAPluginName(message) {
  return this.test('is not a plugin name', message, function(value) {
    return ['admin', ...Object.keys(strapi.plugins)].includes(value)
      ? true
      : this.createError({ path: this.path, message: `${this.path} is not an existing plugin` });
  });
}

function isAContentTypeId(message) {
  return this.test('is not a content-type id', message, function(value) {
    return Object.keys(strapi.contentTypes).includes(value)
      ? true
      : this.createError({
          path: this.path,
          message: `${this.path} is not an existing content-type id`,
        });
  });
}

yup.addMethod(yup.mixed, 'notNil', isNotNill);
yup.addMethod(yup.mixed, 'notNull', isNotNull);
yup.addMethod(yup.array, 'requiredAllowEmpty', arrayRequiredAllowEmpty);
yup.addMethod(yup.string, 'isAPluginName', isAPluginName);
yup.addMethod(yup.string, 'isAContentTypeId', isAContentTypeId);

class StrapiIDSchema extends MixedSchemaType {
  constructor() {
    super({ type: 'strapiID' });
  }

  _typeCheck(value) {
    return typeof value === 'string' || (Number.isInteger(value) && value >= 0);
  }
}

yup.strapiID = () => new StrapiIDSchema();

/**
 * Returns a formatted error for http responses
 * @param {Object} validationError - a Yup ValidationError
 */
const formatYupErrors = validationError => {
  if (!validationError.inner) {
    throw new Error('invalid.input');
  }

  if (validationError.inner.length === 0) {
    if (validationError.path === undefined) return validationError.errors;
    return { [validationError.path]: validationError.errors };
  }

  return validationError.inner.reduce((acc, err) => {
    acc[err.path] = err.errors;
    return acc;
  }, {});
};

module.exports = {
  yup,
  formatYupErrors,
};
