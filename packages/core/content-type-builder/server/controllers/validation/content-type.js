'use strict';

const _ = require('lodash');
const { yup, validateYupSchema, nameToCollectionName } = require('@strapi/utils');

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
const VALID_TYPES = [...DEFAULT_TYPES, 'uid', 'component', 'dynamiczone'];

/**
 * Returns a yup schema to validate a content type payload
 * @param {Object} data payload
 */
const createContentTypeSchema = (data, { isEdition = false } = {}) => {
  const kind = _.get(data, 'contentType.kind', typeKinds.COLLECTION_TYPE);
  const contentTypeSchema = createSchema(VALID_TYPES, VALID_RELATIONS[kind] || [], {
    modelType: modelTypes.CONTENT_TYPE,
  })
    .shape({
      displayName: yup.string().min(1).required(),
      singularName: yup
        .string()
        .min(1)
        .test(alreadyUsedContentTypeName(isEdition))
        .test(forbiddenContentTypeNameValidator())
        .isKebabCase()
        .required(),
      pluralName: yup
        .string()
        .min(1)
        .test(alreadyUsedContentTypeName(isEdition))
        .test(forbiddenCollectionNameValidator())
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
      contentType: contentTypeSchema.required().noUnknown(),
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
  if (_.has(data, 'contentType')) {
    removeEmptyDefaults(data.contentType);
  }

  if (_.has(data, 'components') && Array.isArray(data.components)) {
    data.components.forEach((data) => {
      if (_.has(data, 'uid')) {
        removeEmptyDefaults(data);
      }
    });
  }

  removeDeletedUIDTargetFields(data.contentType);

  return validateYupSchema(createContentTypeSchema(data, { isEdition: true }))(data);
};

/**
 * Validate whether the provided plural name will create a conflict with one of
 * the default DB table names
 * @returns {Object}
 */
const forbiddenCollectionNameValidator = () => {
  const reservedCollectionNames = getService('builder').getReservedNames().collectionNames;

  return {
    name: 'forbiddenCollectionName',
    message: `PluralName must not cause clash with DB table names: ${reservedCollectionNames.join(
      ', '
    )}`,
    test(value) {
      if (value && reservedCollectionNames.includes(nameToCollectionName(value))) {
        return false;
      }
      return true;
    },
  };
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

const alreadyUsedContentTypeName = (isEdition) => {
  const usedNames = _.flatMap(strapi.contentTypes, (ct) => [ct.singularName, ct.pluralName]);

  return {
    name: 'nameAlreadyUsed',
    message: 'Content Type name `${value}` is already being used.',
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
