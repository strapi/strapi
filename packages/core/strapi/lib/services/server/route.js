'use strict';

const { yup } = require('@strapi/utils');

const policyOrMiddlewareSchema = yup.lazy(value => {
  if (typeof value === 'string') {
    return yup.string().required();
  }

  if (typeof value === 'function') {
    return yup.mixed().isFunction();
  }

  return yup.object({
    name: yup.string().required(),
    options: yup.object().notRequired(), // any options
  });
});

const routeSchema = yup.object({
  method: yup
    .string()
    .oneOf(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'ALL'])
    .required(),
  path: yup.string().required(),
  handler: yup.lazy(value => {
    if (typeof value === 'string') {
      return yup.string().required();
    }

    if (Array.isArray(value)) {
      return yup.array().required();
    }

    return yup
      .mixed()
      .isFunction()
      .required();
  }),
  config: yup
    .object({
      policies: yup
        .array()
        .of(policyOrMiddlewareSchema)
        .notRequired(),
      middlwares: yup
        .array()
        .of(policyOrMiddlewareSchema)
        .notRequired(),
    })
    .notRequired(),
});

const validateRouteConfig = routeConfig => {
  try {
    return routeSchema.validateSync(routeConfig, {
      strict: true,
      abortEarly: false,
      stripUnknown: true,
    });
  } catch (error) {
    console.error(error);
    throw new Error('Invalid route config');
  }
};

module.exports = {
  validateRouteConfig,
};
