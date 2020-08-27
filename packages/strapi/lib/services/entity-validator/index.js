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
  async validateEntity(model, data, options = { isDraft: false }) {
    const validator = createValidator(model, options);

    return validator
      .validate(data, {
        abortEarly: false,
      })
      .catch(error => {
        throw strapi.errors.badRequest('ValidationError', { errors: formatYupErrors(error) });
      });
  },

  /**
   * Validate some input for updating based on a model schema
   * @param {Object} model model schema
   * @param {Object} data input data
   */
  async validateEntityUpdate(model, data, options = { isDraft: false }) {
    const validator = createUpdateValidator(model, options);

    return validator
      .validate(data, {
        abortEarly: false,
      })
      .catch(error => {
        throw strapi.errors.badRequest('ValidationError', { errors: formatYupErrors(error) });
      });
  },
});

const isMedia = attr => {
  return (attr.collection || attr.model) === 'file' && attr.plugin === 'upload';
};

const createValidator = (model, { isDraft }) => {
  return yup
    .object(
      _.mapValues(model.attributes, attr => {
        if (isMedia(attr)) {
          return yup.mixed().nullable();
        }

        let validator = createAttributeValidator(attr, { isDraft }).nullable();

        if (_.has(attr, 'default')) {
          validator = validator.default(attr.default);
        }

        if (!isDraft && attr.required) {
          return validator.notNil();
        }

        return validator;
      })
    )
    .required();
};

const createUpdateValidator = (model, { isDraft }) => {
  return yup
    .object(
      _.mapValues(model.attributes, attr => {
        if (isMedia(attr)) {
          return yup.mixed().nullable();
        }

        const validator = createAttributeValidator(attr, { isDraft }).nullable();

        if (!isDraft && attr.required) {
          // on edit you can omit a key to leave it unchanged, but if it is required you cannot set it to null
          return validator.notNull();
        }

        return validator;
      })
    )
    .required();
};

/**
 * Validator for existing types
 */
const createAttributeValidator = (attr, { isDraft }) => {
  if (_.has(validators, attr.type)) {
    return validators[attr.type](attr, { isDraft });
  }

  return yup.mixed();
};
