import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';
import { parseDomain, ParseResultType } from 'parse-domain';

const schema = {
  firstname: yup.mixed().required(translatedErrors.required),
  lastname: yup.mixed().required(translatedErrors.required),
  email: yup
    .string()
    .email(translatedErrors.email)
    .lowercase()
    .required(translatedErrors.required)
    .test('topLevelDomainValidation', translatedErrors.email, function(value) {
      let parseDomainResult = parseDomain(value);
      
return parseDomainResult.type === ParseResultType.Listed;
    }),
  username: yup.string().nullable(),
  password: yup
    .string()
    .min(8, translatedErrors.minLength)
    .matches(/[a-z]/, 'components.Input.error.contain.lowercase')
    .matches(/[A-Z]/, 'components.Input.error.contain.uppercase')
    .matches(/\d/, 'components.Input.error.contain.number'),
  confirmPassword: yup
    .string()
    .min(8, translatedErrors.minLength)
    .oneOf([yup.ref('password'), null], 'components.Input.error.password.noMatch')
    .when('password', (password, passSchema) => {
      return password ? passSchema.required(translatedErrors.required) : passSchema;
    }),
};

export default schema;
