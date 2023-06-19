import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
  description: yup.string().required(translatedErrors.required),
});

export default schema;
