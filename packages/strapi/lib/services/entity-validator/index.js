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
  !attr.collection && !attr.model && attr.type !== 'component' && attr.type !== 'dynamiczone';

const addMinMax = (attr, validator, data) => {
  if (Number.isInteger(attr.min) && (attr.required || (Array.isArray(data) && data.length > 0))) {
    validator = validator.min(attr.min);
  }
  if (Number.isInteger(attr.max)) {
    validator = validator.max(attr.max);
  }
  return validator;
};

const addRequiredValidation = createOrUpdate => (attr, validator, isDraft) => {
  if (!isDraft && attr.required) {
    if (createOrUpdate === 'creation') {
      validator = validator.notNil();
    } else if (createOrUpdate === 'update') {
      validator = validator.notNull();
    }
  } else {
    validator = validator.nullable();
  }
  return validator;
};

const preventCast = validator => validator.transform((val, originalVal) => originalVal);

const createAttributeValidator = createOrUpdate => (attr, data, { isDraft }) => {
  let validator;
  if (isMedia(attr)) {
    validator = yup.mixed();
  } else if (isSimpleAttribute(attr)) {
    // simple attribute
    validator = validators[attr.type](attr, { isDraft });
    validator = addRequiredValidation(createOrUpdate)(attr, validator, isDraft);
  } else {
    // complex attribute (relations, components, dz)
    const attributeModels = strapi.db.getModelsByAttribute(attr);
    if (attributeModels.length === 0) {
      throw new Error('Validation failed: Model not found');
    }
    if (attr.type === 'component') {
      // component
      if (_.get(attr, 'repeatable', false) === true) {
        validator = yup
          .array()
          .of(
            yup.lazy(item =>
              createModelValidator(createOrUpdate)(attributeModels[0], item, { isDraft }).notNull()
            )
          )
          .notNull();
        validator = addMinMax(attr, validator, data);
      } else {
        validator = createModelValidator(createOrUpdate)(attributeModels[0], data, { isDraft });
        validator = addRequiredValidation(createOrUpdate)(attr, validator, isDraft);
      }
    } else if (attr.type === 'dynamiczone') {
      // dynamiczone
      validator = yup
        .array()
        .of(
          yup.lazy(item => {
            const model = strapi.getModel(_.get(item, '__component'));
            const schema = yup
              .object()
              .shape({
                __component: yup
                  .string()
                  .required()
                  .oneOf(_.keys(strapi.components)),
              })
              .notNull();

            return model
              ? schema.concat(createModelValidator(createOrUpdate)(model, item, { isDraft }))
              : schema;
          })
        )
        .notNull();
      validator = addMinMax(attr, validator, data);
    } else {
      // relations
      if (Array.isArray(data)) {
        validator = yup.array().of(yup.mixed());
      } else {
        validator = yup.mixed();
      }
      validator = addRequiredValidation(createOrUpdate)(attr, validator, isDraft);
    }

    validator = preventCast(validator);
  }

  if (createOrUpdate === 'creation' && _.has(attr, 'default')) {
    validator = validator.default(attr.default);
  } else {
    validator = validator.default(undefined);
  }

  return validator;
};

const createModelValidator = createOrUpdate => (model, data, { isDraft }) =>
  yup
    .object()
    .shape(
      _.mapValues(_.get(model, 'attributes', {}), (attr, attrName) =>
        createAttributeValidator(createOrUpdate)(attr, _.get(data, attrName), { isDraft })
      )
    );

const createValidateEntity = createOrUpdate => async (model, data, { isDraft = false } = {}) => {
  const validator = createModelValidator(createOrUpdate)(model, data, { isDraft }).required();
  let validData;
  try {
    validData = await validator.validate(data, { abortEarly: false });
  } catch (e) {
    throw strapi.errors.badRequest('ValidationError', { errors: formatYupErrors(e) });
  }

  return validData;
};

module.exports = {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};
