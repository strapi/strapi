'use strict';

const { yup } = require('@strapi/utils');

const strapiServerSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction().default(() => {}),
    destroy: yup.mixed().isFunction().default(() => {}),
    config: yup.object().default({}),
    routes: yup.array().default([]), // may be removed later
    controllers: yup.object(), // may be removed later
    services: yup.object().default({}),
    policies: yup.object().default({}),
    middlewares: yup.object().default({}), // may be removed later
    hooks: yup.object().default({}), // may be removed later
    contentTypes: yup.array().of(yup.object()).default([]),
  })
  .noUnknown();

const validateStrapiServer = data => {
  return strapiServerSchema.validate(data, { strict: false, abortEarly: false });
};

module.exports = {
  validateStrapiServer,
};
