import { translatedErrors } from '@strapi/strapi/admin';
import * as yup from 'yup';

const schema = yup.object().shape({
  options: yup
    .object()
    .shape({
      from: yup
        .object()
        .shape({
          name: yup.string().required({
            id: translatedErrors.required.id,
            defaultMessage: 'This field is required',
          }),
          email: yup.string().email(translatedErrors.email).required({
            id: translatedErrors.required.id,
            defaultMessage: 'This field is required',
          }),
        })
        .required(),
      response_email: yup.string().email(translatedErrors.email),
      object: yup.string().required({
        id: translatedErrors.required.id,
        defaultMessage: 'This field is required',
      }),
      message: yup.string().required({
        id: translatedErrors.required.id,
        defaultMessage: 'This field is required',
      }),
    })
    .required(translatedErrors.required.id),
});

export default schema;
