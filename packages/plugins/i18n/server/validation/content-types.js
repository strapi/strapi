'use strict';

const { yup } = require('@strapi/utils');
const { YupValidationError } = require('@strapi/utils').errors;

const { get } = require('lodash/fp');

const validateSchema = schema => async (body, errorMessage) => {
  try {
    await schema.validate(body, { strict: true, abortEarly: false });
  } catch (e) {
    throw new YupValidationError(e, errorMessage);
  }
};

const validateGetNonLocalizedAttributesSchema = yup
  .object()
  .shape({
    model: yup.string().required(),
    id: yup.mixed().when('model', {
      is: model => get('kind', strapi.getModel(model)) === 'singleType',
      then: yup.strapiID().nullable(),
      otherwise: yup.strapiID().required(),
    }),
    locale: yup.string().required(),
  })
  .noUnknown()
  .required();

module.exports = {
  validateGetNonLocalizedAttributesInput: validateSchema(validateGetNonLocalizedAttributesSchema),
};
