import { translatedErrors } from '@strapi/helper-plugin';
import * as yup from 'yup';

const schema = yup.object().shape({
  options: yup
    .object()
    .shape({
      from: yup
        .object()
        .shape({
          name: yup.string().required({
            id: translatedErrors.required,
            defaultMessage: 'This field is required',
          }),
          email: yup
            .string()
            .email({
              id: translatedErrors.email,
              defaultMessage: 'This is not a valid email',
            })
            .required({
              id: translatedErrors.required,
              defaultMessage: 'This field is required',
            }),
        })
        .required(),
      response_email: yup.string().email({
        id: translatedErrors.email,
        defaultMessage: 'This is not a valid email',
      }),
      object: yup.string().required({
        id: translatedErrors.required,
        defaultMessage: 'This field is required',
      }),
      message: yup.string().required({
        id: translatedErrors.required,
        defaultMessage: 'This field is required',
      }),
    })
    .required(translatedErrors.required),
});

export default schema;
