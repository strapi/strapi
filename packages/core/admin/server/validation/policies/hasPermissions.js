'use strict';

const _ = require('lodash');
const { yup, handleYupError } = require('@strapi/utils');

const hasPermissionsSchema = yup.object({
  actions: yup.array().of(
    yup.lazy(val => {
      if (_.isArray(val)) {
        return yup
          .array()
          .of(yup.string())
          .min(1)
          .max(2);
      }

      if (_.isString(val)) {
        return yup.string().required();
      }

      return yup.object().shape({
        action: yup.string().required(),
        subject: yup.string(),
      });
    })
  ),
});

const validateHasPermissionsInput = options => {
  try {
    return hasPermissionsSchema.validateSync(options, { strict: true, abortEarly: true });
  } catch (e) {
    handleYupError(e);
  }
};

module.exports = {
  validateHasPermissionsInput,
};
