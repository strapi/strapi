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

const validateFillFromLocaleInputSchema = yup
  .object()
  .shape({
    documentId: yup.string().when('collectionType', {
      is: 'single-types',
      then: (schema) => schema.nullable(),
      otherwise: (schema) => schema.required(),
    }),
    sourceLocale: yup.string().required(),
    targetLocale: yup.string().required(),
    collectionType: yup.string().oneOf(['collection-types', 'single-types']).required(),
  })
  .noUnknown()
  .required();

const validateFillFromLocaleInput = validateYupSchema(validateFillFromLocaleInputSchema);

export { validateGetNonLocalizedAttributesInput, validateFillFromLocaleInput };
