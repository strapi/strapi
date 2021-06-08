'use strict';

const { yup } = require('@strapi/utils');

const contentTypeSchemaValidator = yup.object().shape({
  info: yup
    .object()
    .shape({
      singularName: yup
        .string()
        .isCamelCase()
        .required(),
      pluralName: yup
        .string()
        .isCamelCase()
        .required(),
      displayName: yup.string().required(),
    })
    .required(),
});

const validateContentTypeDefinition = data => {
  return contentTypeSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateContentTypeDefinition,
};
