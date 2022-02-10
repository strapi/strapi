import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = yup.object().shape({
  contentSyncURL: yup
    .string()
    .url()
    .required(translatedErrors.required),
});

export default schema;
