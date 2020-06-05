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
        uid: yup
          .string()
          .matches(
            /^[a-z]([a-z|.|-]+)[a-z]$/,
            v => `${v.path}: The id can only contain lowercase letters, dots and hyphens.`
          )
          .required(),
        section: yup
          .string()
          .oneOf(['contentTypes', 'plugins', 'settings'])
          .required(),
        pluginName: yup
          .string()
          .required()
          .isAPluginName(),
        subjects: yup.mixed().when('section', {
          is: 'contentTypes',
          then: yup
            .array()
            .of(yup.string().isAContentTypeId())
            .required(),
          otherwise: yup.mixed().oneOf([undefined]),
        }),
        displayName: yup.string().required(),
        category: yup.mixed().when('section', {
          is: val => ['plugins', 'contentTypes'].includes(val),
          then: yup.mixed().oneOf([undefined]),
          otherwise: yup.string().required(),
        }),
        subCategory: yup.mixed().when('section', {
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
    if (e.errors.length > 0) {
      throw new yup.ValidationError(e.errors.join(', '));
    } else {
      throw e;
    }
  }
};

module.exports = {
  validateRegisterProviderPermission,
};
