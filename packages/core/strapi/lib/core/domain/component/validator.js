'use strict';

const { yup } = require('@strapi/utils');

const componentSchemaValidator = yup.object().shape({
  schema: yup.object().shape({
    info: yup
      .object()
      .shape({
        displayName: yup.string().required(),
        singularName: yup.string().isKebabCase().required(),
        category: yup.string().isKebabCase().required(),
      })
      .required(),
    attributes: yup.object(),
  }),
});

const validateComponentDefinition = (data) => {
  return componentSchemaValidator.validateSync(data, { strict: true, abortEarly: false });
};

module.exports = {
  validateComponentDefinition,
};
