/**
 * Entity validator
 * Module that will validate input data for entity creation or edition
 */

'use strict';

const { has, assoc, prop, isObject } = require('lodash/fp');
const strapiUtils = require('@strapi/utils');
const validators = require('./validators');

const { yup, validateYupSchema } = strapiUtils;
const { isMediaAttribute, isScalarAttribute, getWritableAttributes } = strapiUtils.contentTypes;
const { ValidationError } = strapiUtils.errors;

const addMinMax = (validator, { attr, updatedAttribute }) => {
  if (
    Number.isInteger(attr.min) &&
    (attr.required || (Array.isArray(updatedAttribute.value) && updatedAttribute.value.length > 0))
  ) {
    validator = validator.min(attr.min);
  }
  if (Number.isInteger(attr.max)) {
    validator = validator.max(attr.max);
  }
  return validator;
};

const addRequiredValidation =
  (createOrUpdate) =>
  (validator, { attr: { required } }) => {
    if (required) {
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

const addDefault =
  (createOrUpdate) =>
  (validator, { attr }) => {
    if (createOrUpdate === 'creation') {
      if (
        ((attr.type === 'component' && attr.repeatable) || attr.type === 'dynamiczone') &&
        !attr.required
      ) {
        validator = validator.default([]);
      } else {
        validator = validator.default(attr.default);
      }
    } else {
      validator = validator.default(undefined);
    }

    return validator;
  };

const preventCast = (validator) => validator.transform((val, originalVal) => originalVal);

const createComponentValidator =
  (createOrUpdate) =>
  ({ attr, updatedAttribute }, { isDraft }) => {
    let validator;

    const model = strapi.getModel(attr.component);
    if (!model) {
      throw new Error('Validation failed: Model not found');
    }

    if (prop('repeatable', attr) === true) {
      validator = yup
        .array()
        .of(
          yup.lazy((item) =>
            createModelValidator(createOrUpdate)({ model, data: item }, { isDraft }).notNull()
          )
        );
      validator = addRequiredValidation(createOrUpdate)(validator, { attr: { required: true } });
      validator = addMinMax(validator, { attr, updatedAttribute });
    } else {
      validator = createModelValidator(createOrUpdate)({ model, updatedAttribute }, { isDraft });
      validator = addRequiredValidation(createOrUpdate)(validator, {
        attr: { required: !isDraft && attr.required },
      });
    }

    return validator;
  };

const createDzValidator =
  (createOrUpdate) =>
  ({ attr, updatedAttribute }, { isDraft }) => {
    let validator;

    validator = yup.array().of(
      yup.lazy((item) => {
        const model = strapi.getModel(prop('__component', item));
        const schema = yup
          .object()
          .shape({
            __component: yup.string().required().oneOf(Object.keys(strapi.components)),
          })
          .notNull();

        return model
          ? schema.concat(createModelValidator(createOrUpdate)({ model, data: item }, { isDraft }))
          : schema;
      })
    );
    validator = addRequiredValidation(createOrUpdate)(validator, { attr: { required: true } });
    validator = addMinMax(validator, { attr, updatedAttribute });

    return validator;
  };

const createRelationValidator =
  (createOrUpdate) =>
  ({ attr, updatedAttribute }, { isDraft }) => {
    let validator;

    if (Array.isArray(updatedAttribute.value)) {
      validator = yup.array().of(yup.mixed());
    } else {
      validator = yup.mixed();
    }

    validator = addRequiredValidation(createOrUpdate)(validator, {
      attr: { required: !isDraft && attr.required },
    });

    return validator;
  };

const createScalarAttributeValidator = (createOrUpdate) => (metas, options) => {
  let validator;

  if (has(metas.attr.type, validators)) {
    validator = validators[metas.attr.type](metas, options);
  } else {
    // No validators specified - fall back to mixed
    validator = yup.mixed();
  }

  validator = addRequiredValidation(createOrUpdate)(validator, {
    attr: { required: !options.isDraft && metas.attr.required },
  });

  return validator;
};

const createAttributeValidator = (createOrUpdate) => (metas, options) => {
  let validator;

  if (isMediaAttribute(metas.attr)) {
    validator = yup.mixed();
  } else if (isScalarAttribute(metas.attr)) {
    validator = createScalarAttributeValidator(createOrUpdate)(metas, options);
  } else {
    if (metas.attr.type === 'component') {
      validator = createComponentValidator(createOrUpdate)(metas, options);
    } else if (metas.attr.type === 'dynamiczone') {
      validator = createDzValidator(createOrUpdate)(metas, options);
    } else {
      validator = createRelationValidator(createOrUpdate)(metas, options);
    }

    validator = preventCast(validator);
  }

  validator = addDefault(createOrUpdate)(validator, metas);

  return validator;
};

const createModelValidator =
  (createOrUpdate) =>
  ({ model, data, entity }, options) => {
    const writableAttributes = model ? getWritableAttributes(model) : [];

    const schema = writableAttributes.reduce((validators, attributeName) => {
      const validator = createAttributeValidator(createOrUpdate)(
        {
          attr: model.attributes[attributeName],
          updatedAttribute: { name: attributeName, value: prop(attributeName, data) },
          model,
          entity,
        },
        options
      );

      return assoc(attributeName, validator)(validators);
    }, {});

    return yup.object().shape(schema);
  };

const createValidateEntity =
  (createOrUpdate) =>
  async (model, data, { isDraft = false } = {}, entity = null) => {
    if (!isObject(data)) {
      const { displayName } = model.info;

      throw new ValidationError(
        `Invalid payload submitted for the ${createOrUpdate} of an entity of type ${displayName}. Expected an object, but got ${typeof data}`
      );
    }

    const validator = createModelValidator(createOrUpdate)(
      {
        model,
        data,
        entity,
      },
      { isDraft }
    ).required();
    return validateYupSchema(validator, { strict: false, abortEarly: false })(data);
  };

module.exports = {
  validateEntityCreation: createValidateEntity('creation'),
  validateEntityUpdate: createValidateEntity('update'),
};
