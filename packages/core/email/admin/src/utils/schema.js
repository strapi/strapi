import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = yup.object().shape({
  email: yup.string().email(translatedErrors.email).required(translatedErrors.required),
});

export default schema;
