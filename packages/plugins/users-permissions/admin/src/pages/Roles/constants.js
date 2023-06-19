import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

export const createRoleSchema = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
  description: yup.string().required(translatedErrors.required),
});
