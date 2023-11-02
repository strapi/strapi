import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = {
  roles: yup.array().min(1, translatedErrors.required).required(translatedErrors.required),
};

export default schema;
