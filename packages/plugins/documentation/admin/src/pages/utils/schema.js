import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  restrictedAccess: yup.boolean(),
  password: yup.string().when('restrictedAccess', (value, initSchema) => {
    return value ? initSchema.required(translatedErrors.required) : initSchema;
  }),
});

export default schema;
