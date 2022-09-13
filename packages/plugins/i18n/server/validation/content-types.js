'use strict';

const { yup, validateYupSchema } = require('@strapi/utils');

const { get } = require('lodash/fp');

const validateGetNonLocalizedAttributesSchema = yup
  .object()
  .shape({
    model: yup.string().required(),
    id: yup.mixed().when('model', {
      is: (model) => get('kind', strapi.contentType(model)) === 'singleType',
      then: yup.strapiID().nullable(),
      otherwise: yup.strapiID().required(),
    }),
    locale: yup.string().required(),
  })
  .noUnknown()
  .required();

module.exports = {
  validateGetNonLocalizedAttributesInput: validateYupSchema(
    validateGetNonLocalizedAttributesSchema
  ),
};
