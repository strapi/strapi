'use strict';

const yup = require('yup');
const { typeKinds, coreUids } = require('../../services/constants');
const { validators, isValidName } = require('./common');

const REVERSE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];
const STRAPI_USER_RELATIONS = ['oneWay', 'manyWay'];

const isValidNature = validNatures =>
  function(value) {
    const allowedRelations =
      this.parent.target === coreUids.STRAPI_USER ? STRAPI_USER_RELATIONS : validNatures;

    return allowedRelations.includes(value)
      ? true
      : this.createError({
          path: this.path,
          message: `must be one of the following values: ${allowedRelations.join(', ')}`,
        });
  };

module.exports = (obj, validNatures) => {
  const contentTypesUIDs = Object.keys(strapi.contentTypes)
    .filter(key => strapi.contentTypes[key].kind === typeKinds.COLLECTION_TYPE)
    .filter(key => !key.startsWith(coreUids.PREFIX) || key === coreUids.STRAPI_USER)
    .concat(['__self__', '__contentType__']);

  return {
    target: yup
      .string()
      .oneOf(contentTypesUIDs)
      .required(),
    nature: yup
      .string()
      .test('isValidNature', isValidNature(validNatures))
      .required(),
    unique: validators.unique.nullable(),
    configurable: yup.boolean().nullable(),
    autoPopulate: yup.boolean().nullable(),
    dominant: yup.boolean().nullable(),
    columnName: yup.string().nullable(),
    targetAttribute: REVERSE_RELATIONS.includes(obj.nature)
      ? yup
          .string()
          .test(isValidName)
          .required()
      : yup
          .string()
          .test(isValidName)
          .nullable(),
    targetColumnName: yup.string().nullable(),
    private: yup.boolean().nullable(),
    pluginOptions: yup.object(),
  };
};
