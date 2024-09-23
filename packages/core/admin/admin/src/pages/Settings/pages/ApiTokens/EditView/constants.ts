import * as yup from 'yup';

import { translatedErrors } from '../../../../../utils/translatedErrors';

export const schema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required.id),
  type: yup
    .string()
    .oneOf(['read-only', 'full-access', 'custom'])
    .required(translatedErrors.required.id),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required.id),
});
