'use strict';

const yup = require('yup');
const _ = require('lodash');
const { validators } = require('./common');

const VALID_NATURES = ['oneWay', 'manyWay'];

module.exports = () => {
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
      .oneOf(VALID_NATURES)
      .required(),
    plugin: yup.string().oneOf(Object.keys(strapi.plugins)),
    unique: validators.unique,

    // TODO: remove once front-end stop sending them even if useless
    columnName: yup.string(),
    key: yup.string(),
    targetColumnName: yup.string(),
  };
};
