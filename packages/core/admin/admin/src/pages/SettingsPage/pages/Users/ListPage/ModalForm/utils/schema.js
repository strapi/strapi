import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = yup.object().shape({
  firstname: yup.string().trim().required(translatedErrors.required),
  lastname: yup.string(),
  email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
  roles: yup.array().min(1, translatedErrors.required).required(translatedErrors.required),
});

export default schema;
