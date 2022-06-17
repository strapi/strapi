import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const URL_REGEX = new RegExp('(^$)|((.+:\\/\\/.*)(d*)\\/?(.*))');

const schema = yup.object().shape({
  email_confirmation_redirection: yup.mixed().when('email_confirmation', {
    is: true,
    then: yup
      .string()
      .matches(URL_REGEX)
      .required(),
    otherwise: yup.string().nullable(),
  }),
  email_reset_password: yup
    .string(translatedErrors.string)
    .matches(URL_REGEX, translatedErrors.regex)
    .nullable(),
});

export default schema;
