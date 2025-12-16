import * as yup from 'yup';

import { translatedErrors } from '../../../../../utils/translatedErrors';

export const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required.id),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required.id),
  roles: yup
    .array()
    .of(yup.number().required())
    .min(1, {
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    })
    .required({
      id: translatedErrors.required.id,
      defaultMessage: 'This field is required',
    }),
});

