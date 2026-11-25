import * as yup from 'yup';

import { translatedErrors } from '../../../../utils/translatedErrors';

export const API_TOKEN_TYPE = 'api-token';
export const TRANSFER_TOKEN_TYPE = 'transfer-token';

export const apiTokenInformationSchema = yup.object().shape({
  name: yup.string().max(100).required(translatedErrors.required.id),
  type: yup.string().oneOf(['read-only', 'full-access', 'custom']).optional(),
  description: yup.string().nullable(),
  lifespan: yup.number().integer().min(0).nullable().defined(translatedErrors.required.id),
});
