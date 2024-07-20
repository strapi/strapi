import { yup, validateYupSchema } from '@strapi/utils';

import { get } from 'lodash/fp';

const validateGetNonLocalizedAttributesSchema = yup
  .object()
  .shape({
    model: yup.string().required(),
    id: yup.mixed().when('model', {
      is: (model: any) => get('kind', strapi.contentType(model)) === 'singleType',
      then: yup.strapiID().nullable(),
      otherwise: yup.strapiID().required(),
    }),
    locale: yup.string().required(),
  })
  .noUnknown()
  .required();

const validateGetNonLocalizedAttributesInput = validateYupSchema(
  validateGetNonLocalizedAttributesSchema
);

export { validateGetNonLocalizedAttributesInput };
