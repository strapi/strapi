'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');

const hasPermissionsSchema = yup.array().of(
  yup.lazy(val => {
    if (_.isArray(val)) {
      return yup
        .array()
        .of(yup.string())
        .min(1)
        .max(2);
    }

    if (_.isString(val)) {
      return yup.string();
    }

    return yup.object().shape({
      action: yup.string().required(),
      subject: yup.string(),
    });
  })
);

const validateHasPermissionsInput = data => {
  try {
    return hasPermissionsSchema.validateSync(data, { strict: true, abortEarly: true });
  } catch (e) {
    throw new Error(formatYupErrors(e));
  }
};

module.exports = {
  validateHasPermissionsInput,
};
