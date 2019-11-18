'use strict';

const yup = require('yup');
const { validators, isValidName } = require('./common');

const REVERSE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];

module.exports = (obj, validNatures) => {
  const contentTypesUIDs = Object.keys(strapi.contentTypes);

  return {
    target: yup
      .string()
      .oneOf(contentTypesUIDs)
      .required(),
    nature: yup
      .string()
      .oneOf(validNatures)
      .required(),
    unique: validators.unique,
    dominant: yup.boolean(),
    columnName: yup.string(),
    targetAttribute: REVERSE_RELATIONS.includes(obj.nature)
      ? yup
          .string()
          .test(isValidName)
          .required()
      : yup.string().test(isValidName),
    targetColumnName: yup.string(),
  };
};
