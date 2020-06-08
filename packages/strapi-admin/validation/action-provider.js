'use strict';

const { yup } = require('strapi-utils');

const registerProviderActionSchema = yup
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
        pluginName: yup.mixed().when('section', {
          is: 'plugins',
          then: yup
            .string()
            .isAPluginName()
            .required(),
          otherwise: yup.string().isAPluginName(),
        }),
        subjects: yup.mixed().when('section', {
          is: 'contentTypes',
          then: yup
            .array()
            .of(yup.string().isAContentTypeId())
            .required(),
          otherwise: yup
            .mixed()
            .oneOf([undefined], 'subjects should only be defined for the "contentTypes" section'),
        }),
        displayName: yup.string().required(),
        category: yup.mixed().when('section', {
          is: val => ['plugins', 'contentTypes'].includes(val),
          then: yup
            .mixed()
            .oneOf([undefined], 'category should only be defined for the "settings" section'),
          otherwise: yup.string().required(),
        }),
        subCategory: yup.mixed().when('section', {
          is: 'contentTypes',
          then: yup
            .mixed()
            .oneOf(
              [undefined],
              'subCategory should only be defined for "plugins" and "settings" sections'
            ),
          otherwise: yup.string(),
        }),
        conditions: yup.array().of(yup.string()),
      })
      .noUnknown()
  );

const validateRegisterProviderAction = data => {
  try {
    registerProviderActionSchema.validateSync(data, { strict: true, abortEarly: false });
  } catch (e) {
    if (e.errors.length > 0) {
      throw new yup.ValidationError(e.errors.join(', '));
    } else {
      throw e;
    }
  }
};

module.exports = {
  validateRegisterProviderAction,
};
