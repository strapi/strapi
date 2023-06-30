import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  name: yup.string(translatedErrors.string).max(100).required(translatedErrors.required),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required),
  permissions: yup.string(translatedErrors.string).required(translatedErrors.required),
});

export default schema;
