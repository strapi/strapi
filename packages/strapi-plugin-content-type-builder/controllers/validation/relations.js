'use strict';

const _ = require('lodash');
const yup = require('yup');
const { validators, isValidName } = require('./common');

const REVERSE_RELATIONS = ['oneToOne', 'oneToMany', 'manyToOne', 'manyToMany'];

module.exports = validNatures => {
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
          .test({
            name: 'checkAvailableAttribute',
            message: `The attribute '${obj.targetAttribute}' already exists in the target`,
            test: value => {
              const targetContentType = strapi.contentTypes[obj.target];
              if (_.has(targetContentType.attributes, value)) return false;
              return true;
            },
          })
          .required()
      : yup.string().test(isValidName),
    targetColumnName: yup.string(),
  };
};
