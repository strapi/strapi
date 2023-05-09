/* eslint-disable no-template-curly-in-string */ // yup templates need to be in this format

'use strict';

const { flatMap, getOr, has } = require('lodash/fp');
const { yup, validateYupSchema } = require('@strapi/utils');

const { getService } = require('../../utils');
const { modelTypes, DEFAULT_TYPES, typeKinds } = require('../../services/constants');
const createSchema = require('./model-schema');
const { removeEmptyDefaults, removeDeletedUIDTargetFields } = require('./data-transform');
const { nestedComponentSchema } = require('./component');

/**
 * Allowed relation per type kind
 */
const VALID_RELATIONS = {
  [typeKinds.SINGLE_TYPE]: [
    'oneToOne',
    'oneToMany',
    'morphOne',
    'morphMany',
    'morphToOne',
    'morphToMany',
  ],
  [typeKinds.COLLECTION_TYPE]: [
    'oneToOne',
    'oneToMany',
    'manyToOne',
    'manyToMany',
    'morphOne',
    'morphMany',
    'morphToOne',
    'morphToMany',
  ],
};

/**
 * Allowed types
 */
const VALID_TYPES = [...DEFAULT_TYPES, 'uid', 'component', 'dynamiczone', 'customField'];

/**
 * Returns a yup schema to validate a content type payload
 * @param {Object} data payload
 */
const createContentTypeSchema = (data, { isEdition = false } = {}) => {
  const kind = getOr(typeKinds.COLLECTION_TYPE, 'contentType.kind', data);
  const contentTypeSchema = createSchema(VALID_TYPES, VALID_RELATIONS[kind] || [], {
    modelType: modelTypes.CONTENT_TYPE,
  })
    .shape({
      displayName: yup.string().min(1).required(),
      singularName: yup
        .string()
        .min(1)
        .test(nameIsAvailable(isEdition))
        .test(forbiddenContentTypeNameValidator())
        .isKebabCase()
        .required(),
      pluralName: yup
        .string()
        .min(1)
        .test(nameIsAvailable(isEdition))
        .test(nameIsNotExistingCollectionName(isEdition)) // TODO: v5: require singularName to not match a collection name
        .test(forbiddenContentTypeNameValidator())
        .isKebabCase()
        .required(),
    })
    .test(
      'singularName-not-equal-pluralName',
      '${path}: singularName and pluralName should be different',
      (value) => value.singularName !== value.pluralName
    );

  return yup
    .object({
      // FIXME .noUnknown(false) will strip off the unwanted properties without throwing an error
      // Why not having .noUnknown() ? Because we want to be able to add options relatable to EE features
      // without having any reference to them in CE.
      // Why not handle an "options" object in the content-type ? The admin panel needs lots of rework
      // to be able to send this options object instead of top-level attributes.
      // @nathan-pichon 20/02/2023
      contentType: contentTypeSchema.required().noUnknown(false),
      components: nestedComponentSchema,
    })
    .noUnknown();
};

/**
 * Validator for content type creation
 */
const validateContentTypeInput = (data) => {
  return validateYupSchema(createContentTypeSchema(data))(data);
};

/**
 * Validator for content type edition
 */
const validateUpdateContentTypeInput = (data) => {
  if (has('contentType', data)) {
    removeEmptyDefaults(data.contentType);
  }

  if (has('components', data) && Array.isArray(data.components)) {
    data.components.forEach((data) => {
      if (has('uid', data)) {
        removeEmptyDefaults(data);
      }
    });
  }

  removeDeletedUIDTargetFields(data.contentType);

  return validateYupSchema(createContentTypeSchema(data, { isEdition: true }))(data);
};

const forbiddenContentTypeNameValidator = () => {
  const reservedNames = getService('builder').getReservedNames().models;

  return {
    name: 'forbiddenContentTypeName',
    message: `Content Type name cannot be one of ${reservedNames.join(', ')}`,
    test(value) {
      if (value && reservedNames.includes(value)) {
        return false;
      }

      return true;
    },
  };
};

const nameIsAvailable = (isEdition) => {
  const usedNames = flatMap((ct) => {
    return [ct.info?.singularName, ct.info?.pluralName];
  })(strapi.contentTypes);

  return {
    name: 'nameAlreadyUsed',
    message: 'contentType: name `${value}` is already being used by another content type.',
    test(value) {
      // don't check on edition
      if (isEdition) return true;

      if (usedNames.includes(value)) {
        return false;
      }
      return true;
    },
  };
};

const nameIsNotExistingCollectionName = (isEdition) => {
  const usedNames = Object.keys(strapi.contentTypes).map(
    (key) => strapi.contentTypes[key].collectionName
  );

  return {
    name: 'nameAlreadyUsed',
    message: 'contentType: name `${value}` is already being used by another content type.',
    test(value) {
      // don't check on edition
      if (isEdition) return true;

      if (usedNames.includes(value)) {
        return false;
      }
      return true;
    },
  };
};

/**
 * Validates type kind
 */
const kindSchema = yup.string().oneOf([typeKinds.SINGLE_TYPE, typeKinds.COLLECTION_TYPE]);

module.exports = {
  validateContentTypeInput,
  validateUpdateContentTypeInput,
  validateKind: validateYupSchema(kindSchema),
};
