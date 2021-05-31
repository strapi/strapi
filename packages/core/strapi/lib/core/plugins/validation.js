'use strict';

const { yup } = require('@strapi/utils');

const strapiServerSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
    config: yup.object(),
    routes: yup.array(), // may be removed later
    controllers: yup.object(), // may be removed later
    services: yup.object(),
    policies: yup.object(),
    middlewares: yup.object(), // may be removed later
    hooks: yup.object(), // may be removed later
    contentTypes: yup.array().of(yup.object()),
  })
  .noUnknown();

const validateStrapiServer = data => {
  return strapiServerSchema.validate(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateStrapiServer,
};
