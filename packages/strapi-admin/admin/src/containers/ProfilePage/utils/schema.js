import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';
import { profileValidation } from '../../../validations/users';

const schema = yup.object().shape({
  ...profileValidation,
  currentPassword: yup
    .string()
    .when(['password', 'confirmPassword'], (password, confirmPassword, passSchema) => {
      return password || confirmPassword
        ? passSchema.required(translatedErrors.required)
        : passSchema;
    }),
});

export default schema;
