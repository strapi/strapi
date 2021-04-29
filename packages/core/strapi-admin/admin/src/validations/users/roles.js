import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';

const schema = {
  roles: yup.array().required(translatedErrors.required),
};

export default schema;
