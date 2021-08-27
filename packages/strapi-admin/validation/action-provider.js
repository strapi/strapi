'use strict';

const { yup } = require('strapi-utils');
const validators = require('./common-validators');

const registerProviderActionSchema = yup
  .array()
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
          then: validators.isAPluginName.required(),
          otherwise: validators.isAPluginName,
        }),
        subjects: yup.mixed().when('section', {
          is: 'contentTypes',
          then: yup
            .array()
            .of(yup.string())
            .required(),
          otherwise: yup
            .mixed()
            .oneOf([undefined], 'subjects should only be defined for the "contentTypes" section'),
        }),
        displayName: yup.string().required(),
        category: yup.mixed().when('section', {
          is: 'settings',
          then: yup.string().required(),
          otherwise: yup
            .mixed()
            .test(
              'settingsCategory',
              'category should only be defined for the "settings" section',
              cat => cat === undefined
            ),
        }),
        subCategory: yup.mixed().when('section', {
          is: section => ['settings', 'plugins'].includes(section),
          then: yup.string(),
          otherwise: yup
            .mixed()
            .test(
              'settingsSubCategory',
              'subCategory should only be defined for "plugins" and "settings" sections',
              subCat => {
                return subCat === undefined;
              }
            ),
        }),
        options: yup.object({
          applyToProperties: yup.array().of(yup.string()),
        }),
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
