import * as yup from 'yup';
import { validators, validateYupSchema } from '@strapi/utils';

import { get } from 'lodash/fp';

const validateGetNonLocalizedAttributesSchema = yup
  .object()
  .shape({
    model: yup.string().required(),
    id: yup.mixed().when('model', {
      is: (model: any) => get('kind', strapi.contentType(model)) === 'singleType',
      then: validators.strapiID().nullable(),
      otherwise: validators.strapiID().required(),
    }),
    locale: yup.string().required(),
  })
  .noUnknown()
  .required();

const validateGetNonLocalizedAttributesInput = validateYupSchema(
  validateGetNonLocalizedAttributesSchema
);

export { validateGetNonLocalizedAttributesInput };
