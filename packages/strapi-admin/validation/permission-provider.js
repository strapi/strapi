'use strict';

const { yup } = require('strapi-utils');

const registerProviderPermissionSchema = yup
  .array()
  .requiredAllowEmpty()
  .required()
  .of(
    yup
      .object()
      .shape({
        name: yup.string().required(),
        section: yup
          .string()
          .oneOf(['contentTypes', 'plugins', 'settings'])
          .required(),
        pluginName: yup.mixed().when('section', {
          is: 'contentTypes',
          then: yup.mixed().oneOf([undefined]),
          otherwise: yup
            .string()
            .required()
            .isAPluginName(),
        }),
        displayName: yup.string().required(),
        category: yup
          .mixed()
          .when('section', {
            is: val => ['plugins', 'contentTypes'].includes(val),
            then: yup.mixed().oneOf([undefined]),
            otherwise: yup.string().required(),
          }),
        subCategory: yup
          .mixed()
          .when('section', {
            is: 'contentTypes',
            then: yup.mixed().oneOf([undefined]),
            otherwise: yup.string(),
          }),
        conditions: yup.array().of(yup.string()),
      })
      .noUnknown()
  );

const validateRegisterProviderPermission = data => {
  try {
    registerProviderPermissionSchema.validateSync(data, { strict: true, abortEarly: false });
  } catch (e) {
    strapi.stopWithError(e);
  }
};

module.exports = {
  validateRegisterProviderPermission,
};
