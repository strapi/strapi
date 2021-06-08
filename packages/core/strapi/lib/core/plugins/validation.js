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
    routes: yup.array().requiredAllowEmpty(), // may be removed later
    controllers: yup.object().required(), // may be removed later
    services: yup
      .mixed()
      .isFunction()
      .required(),
    policies: yup.object().required(),
    middlewares: yup.object().required(), // may be removed later
    hooks: yup.object().required(), // may be removed later
    contentTypes: yup.array().requiredAllowEmpty(),
  })
  .noUnknown();

const validateStrapiServer = data => {
  return strapiServerSchema.validateSync(data, { strict: true, abortEarly: false });
};

const validateContentTypesUnicity = contentTypes => {
  const names = [];
  contentTypes.forEach(ct => {
    if (names.includes(ct.info.singularName)) {
      throw new Error(`The singular name "${ct.info.singularName}" should be unique`);
    }
    names.push(ct.info.singularName);
    if (names.includes(ct.info.pluralName)) {
      throw new Error(`The plural name "${ct.info.pluralName}" should be unique`);
    }
    names.push(ct.info.pluralName);
  });
};

module.exports = {
  validateStrapiServer,
  validateContentTypesUnicity,
};
