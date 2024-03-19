import { translatedErrors } from '@strapi/strapi/admin';
import * as yup from 'yup';

// eslint-disable-next-line prefer-regex-literals
const URL_REGEX = new RegExp('(^$)|((.+:\\/\\/.*)(d*)\\/?(.*))');

const schema = yup.object().shape({
  email_confirmation_redirection: yup.mixed().when('email_confirmation', {
    is: true,
    then: yup.string().matches(URL_REGEX).required(),
    otherwise: yup.string().nullable(),
  }),
  email_reset_password: yup
    .string(translatedErrors.string)
    .matches(URL_REGEX, {
      id: translatedErrors.regex.id,
      defaultMessage: 'This is not a valid URL',
    })
    .nullable(),
});

export default schema;
