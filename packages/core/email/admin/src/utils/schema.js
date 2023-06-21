import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
});

export default schema;
