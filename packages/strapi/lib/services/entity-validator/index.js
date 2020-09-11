/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */
'use strict';

const _ = require('lodash');

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('./validators');

const isMedia = attr => (attr.collection || attr.model) === 'file' && attr.plugin === 'upload';

const isSimpleAttribute = attr =>
  !attr.collection && !attr.model && attr.type !== 'component' && attr.model !== 'dynamiczone';

const createAttributeValidator = createOrUpdate => (attr, data, { isDraft }) => {
  let validator;
  if (isMedia(attr)) {
    validator = yup.mixed();
  } else if (isSimpleAttribute(attr)) {
    // simple attribute
    validator = validators[attr.type](attr, { isDraft });
  } else {
    // complex attribute (relations, components, dz)
    const attributeModels = strapi.db.getModelsByAttribute(attr);
    if (attributeModels.length === 0) {
      throw new Error('Validation failed: Model not found');
    }
    if (attr.type === 'component') {
      // component
      if (_.get(attr, 'repeatable', false) === true) {
        validator = yup.array().of(createModelValidator(attributeModels[0], data, { isDraft }));
        if (Number.isInteger(attr.min)) {
          validator.min(attr.min);
        }
        if (Number.isInteger(attr.max)) {
          validator.max(attr.max);
        }
      } else {
        validator = createModelValidator(createOrUpdate)(attributeModels[0], data, { isDraft });
      }
    } else if (attr.type === 'dynamiczone') {
      // dynamiczone
      validator = yup
        .array()
        .of(
          yup.object().shape({
            __component: yup
              .string()
              .required()
              .oneOf(_.keys(strapi.components)),
          })
        )
        .concat(
          yup.array().of(
            yup.lazy(item => {
              const model = strapi.getModel(item.__component);
              return createModelValidator(model, data, { isDraft });
            })
          )
        );

      if (Number.isInteger(attr.min)) {
        validator.min(attr.min);
      }
      if (Number.isInteger(attr.max)) {
        validator.max(attr.max);
      }
    } else {
      // relations
      if (Array.isArray(data)) {
        validator = yup.array().of(yup.mixed());
      } else {
        validator = yup.mixed();
      }
    }
  }

  // add required validation
  if (!isDraft && attr.required) {
    if (createOrUpdate === 'creation') {
      validator = validator.notNil();
    } else if (createOrUpdate === 'update') {
      validator = validator.notNull();
    }
  } else {
    validator = validator.nullable();
  }

  if (createOrUpdate === 'creation' && _.has(attr, 'default')) {
    validator = validator.default(attr.default);
  } else {
    validator = validator.default(undefined);
  }

  return validator;
};

const createModelValidator = createOrUpdate => (model, data, { isDraft }) =>
  yup.object(
    _.mapValues(model.attributes, (attr, attrName) =>
      createAttributeValidator(createOrUpdate)(attr, _.get(data, attrName), { isDraft })
    )
  );

const createValidateEntity = createOrUpdate => (model, data, { isDraft = false } = {}) => {
  const validator = createModelValidator(createOrUpdate)(model, data, { isDraft }).required();

  return validator.validate(data, { abortEarly: false }).catch(error => {
    throw strapi.errors.badRequest('ValidationError', { errors: formatYupErrors(error) });
  });
};

module.exports = {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};
