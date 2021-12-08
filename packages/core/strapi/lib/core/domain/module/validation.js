'use strict';

const { yup } = require('@strapi/utils');

const strapiServerSchema = yup
  .object()
  .shape({
    bootstrap: yup.mixed().isFunction(),
    destroy: yup.mixed().isFunction(),
    register: yup.mixed().isFunction(),
    config: yup.object(),
    routes: yup.lazy(value => {
      if (Array.isArray(value)) {
        return yup.array();
      } else {
        return yup.object();
      }
    }),
    controllers: yup.object(),
    services: yup.object(),
    policies: yup.object(),
    middlewares: yup.object(),
    contentTypes: yup.object(),
  })
  .noUnknown();

const validateModule = data => {
  return strapiServerSchema.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateModule,
};
