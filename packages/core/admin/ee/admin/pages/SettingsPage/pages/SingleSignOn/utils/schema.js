import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  autoRegister: yup.bool().required(translatedErrors.required),
  defaultRole: yup.mixed().when('autoRegister', (value, initSchema) => {
    return value ? initSchema.required(translatedErrors.required) : initSchema.nullable();
  }),
  ssoLockedRoles: yup
    .array()
    .nullable()
    .of(
      yup.mixed().when('ssoLockedRoles', (value, initSchema) => {
        return value ? initSchema.required(translatedErrors.required) : initSchema.nullable();
      })
    ),
});

export default schema;
