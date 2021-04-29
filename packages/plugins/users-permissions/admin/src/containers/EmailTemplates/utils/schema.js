import * as yup from 'yup';
import { translatedErrors } from '@strapi/helper-plugin';

const schema = yup.object().shape({
  options: yup
    .object()
    .shape({
      from: yup
        .object()
        .shape({
          name: yup.string().required(translatedErrors.required),
          email: yup
            .string()
            .email(translatedErrors.email)
            .required(translatedErrors.required),
        })
        .required(),
      response_email: yup.string().email(translatedErrors.email),
      object: yup.string().required(translatedErrors.required),
      message: yup.string().required(translatedErrors.required),
    })
    .required(translatedErrors.required),
});

export default schema;
