import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin/lib/src';

const schema = yup.object().shape({
  name: yup.string().required(translatedErrors.required),
});

export default schema;
