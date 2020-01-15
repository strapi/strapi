import * as yup from 'yup';
import { translatedErrors } from 'strapi-helper-plugin';
import { NAME_REGEX, URL_REGEX } from './fieldsRegex';

const schema = yup.object().shape({
  name: yup
    .string(translatedErrors.string)
    .nullable()
    .required(translatedErrors.required)
    .matches(NAME_REGEX, translatedErrors.regex),
  url: yup
    .string(translatedErrors.string)
    .nullable()
    .required(translatedErrors.required)
    .matches(URL_REGEX, translatedErrors.regex),
  headers: yup
    .array()
    .of(
      yup.object().shape({
        key: yup.string().required(),
        value: yup.string().required(),
      })
    )
    .nullable(),
  events: yup
    .array()
    .nullable()
    .required(translatedErrors.required),
});

export default schema;
