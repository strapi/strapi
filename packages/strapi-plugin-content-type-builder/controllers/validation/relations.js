'use strict';

const yup = require('yup');
const { validators, isValidName } = require('./common');
const { typeKinds } = require('./constants');

const REVERSE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];

module.exports = (obj, validNatures) => {
  const contentTypesUIDs = Object.keys(strapi.contentTypes)
    .filter(key => strapi.contentTypes[key].kind === typeKinds.COLLECTION_TYPE)
    .concat(['__self__', '__contentType__']);

  return {
    target: yup
      .string()
      .oneOf(contentTypesUIDs)
      .required(),
    nature: yup
      .string()
      .oneOf(validNatures)
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
  };
};
