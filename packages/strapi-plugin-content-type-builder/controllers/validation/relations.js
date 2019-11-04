'use strict';

const yup = require('yup');
const _ = require('lodash');
const { validators } = require('./common');

module.exports = validNatures => {
  return {
    target: yup
      .mixed()
      .when('plugin', plugin => {
        if (!plugin)
          return yup
            .string()
            .oneOf(
              Object.keys(strapi.models).filter(name => name !== 'core_store')
            );

        if (plugin === 'admin')
          return yup.string().oneOf(Object.keys(strapi.admin.models));

        if (plugin)
          return yup
            .string()
            .oneOf(Object.keys(_.get(strapi.plugins, [plugin, 'models'], {})));
      })
      .required(),
    nature: yup
      .string()
      .oneOf(validNatures)
      .required(),
    plugin: yup.string().oneOf(['', ...Object.keys(strapi.plugins)]),
    unique: validators.unique,
    dominant: yup.boolean(),
    columnName: yup.string(),
    targetAttribute: yup.string(),
    targetColumnName: yup.string(),
  };
};
