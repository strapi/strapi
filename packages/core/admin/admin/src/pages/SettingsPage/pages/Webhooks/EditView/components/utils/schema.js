import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';
import { NAME_REGEX, URL_REGEX } from './fieldsRegex';

const schema = yup.object().shape({
  name: yup
    .string(translatedErrors.string)
    .required(translatedErrors.required)
    .matches(NAME_REGEX, translatedErrors.regex),
  url: yup
    .string(translatedErrors.string)
    .required(translatedErrors.required)
    .matches(URL_REGEX, translatedErrors.regex),
  headers: yup.lazy(array => {
    let baseSchema = yup.array();

    if (array.length === 1) {
      const { key, value } = array[0];

      if (!key && !value) {
        return baseSchema;
      }
    }

    return baseSchema.of(
      yup.object().shape({
        key: yup.string().required(translatedErrors.required),
        value: yup.string().required(translatedErrors.required),
      })
    );
  }),
  events: yup.array(),
});

export default schema;
