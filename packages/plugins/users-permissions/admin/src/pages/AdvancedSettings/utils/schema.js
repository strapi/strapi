import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const URL_REGEX = new RegExp('(^$)|((https?://.*)(d*)/?(.*))');

const schema = yup.object().shape({
  email_confirmation_redirection: yup
    .string(translatedErrors.string)
    .matches(URL_REGEX, translatedErrors.regex)
    .nullable()
    .when('email_confirmation', {
      is: true,
      then: yup.string().required(translatedErrors.required),
      otherwise: yup.string(),
    }),
  email_reset_password: yup
    .string(translatedErrors.string)
    .matches(URL_REGEX, translatedErrors.regex)
    .nullable(),
});

export default schema;
