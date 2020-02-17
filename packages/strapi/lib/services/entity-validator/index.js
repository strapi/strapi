/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */
'use strict';

const _ = require('lodash');

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./validators');

module.exports = ({ strapi }) => ({
  /**
   * Validate some input based on a model schema
   * @param {Object} model model schema
   * @param {Object} data input data
   */
  async validateEntity(model, data) {
    const validator = createValidator(model);

    return validator
      .validate(data, {
        strict: true,
        abortEarly: false,
      })
      .catch(error => {
        throw strapi.errors.badRequest(
          'ValidationError',
          formatYupErrors(error)
        );
      });
  },
});

const createValidator = model => {
  return yup
    .object(
      _.mapValues(model.attributes, attr => {
        const { required } = attr;

        const validator = createAttributeValidator(attr);

        if (required) {
          return validator.defined();
        }
        return validator;
      })
    )
    .required();
};

/**
 * Validator for existing types
 */
const createAttributeValidator = attr => {
  if (_.has(validators, attr.type)) {
    return validators[attr.type](attr);
  }

  return yup.mixed();
};
