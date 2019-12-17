'use strict';

const yup = require('yup');
const { validators, isValidName } = require('./common');

const REVERSE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];

module.exports = (obj, validNatures) => {
  const contentTypesUIDs = Object.keys(strapi.contentTypes).concat([
    '__self__',
    '__contentType__',
  ]);

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
