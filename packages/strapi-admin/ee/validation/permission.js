'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const validators = require('../../validation/common-validators');
const { checkFieldsAreCorrectlyNested } = require('../../validation/common-functions');

const handleReject = error => Promise.reject(formatYupErrors(error));

const updatePermissionsSchema = yup
  .object()
  .shape({
    permissions: yup
      .array()
      .of(
        yup
          .object()
          .shape({
            action: yup.string().required(),
            subject: yup.string().nullable(),
            fields: yup
              .array()
              .of(yup.string())
              .test(
                'field-nested',
                'Fields format are incorrect (duplicates or bad nesting).',
                checkFieldsAreCorrectlyNested
              ),
            conditions: validators.arrayOfConditionNames,
          })
          .noUnknown()
      )
      .requiredAllowEmpty(),
  })
  .required()
  .noUnknown();

const validatedUpdatePermissionsInput = data => {
  return updatePermissionsSchema
    .validate(data, { strict: true, abortEarly: false })
    .catch(handleReject);
};

module.exports = {
  validatedUpdatePermissionsInput,
};
