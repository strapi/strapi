import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

export const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required),
  type: yup
    .string()
    .oneOf(['read-only', 'full-access', 'custom'])
    .required(translatedErrors.required),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required),
});
