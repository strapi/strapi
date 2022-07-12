import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = yup.object().shape({
  name: yup.string(translatedErrors.string).required(translatedErrors.required),
  type: yup
    .string(translatedErrors.string)
    .oneOf(['read-only', 'full-access'])
    .required(translatedErrors.required),
  description: yup.string().nullable(),
  duration: yup
    .string(translatedErrors.string)
    .oneOf(['7', '30', '90', 'unlimited'])
    .required(translatedErrors.required),
});

export default schema;
