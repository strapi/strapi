import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = {
  roles: yup
    .array()
    .min(1, translatedErrors.required)
    .required(translatedErrors.required),
};

export default schema;
