'use strict';

const { yup } = require('@strapi/utils');

const strapiServerSchema = yup
  .object()
  .shape({
    bootstrap: yup
      .mixed()
      .isFunction()
      .required(),
    destroy: yup
      .mixed()
      .isFunction()
      .required(),
    register: yup
      .mixed()
      .isFunction()
      .required(),
    config: yup.object().required(),
    routes: yup.array().required(), // may be removed later
    controllers: yup.object().required(), // may be removed later
    services: yup.object().required(),
    policies: yup.object().required(),
    middlewares: yup.object().required(), // may be removed later
    contentTypes: yup.object().required(),
  })
  .noUnknown();

const validateModule = data => {
  return strapiServerSchema.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateModule,
};
