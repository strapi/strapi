import { prop } from 'lodash/fp';
import { yup, validateYupSchema } from '@strapi/utils';

import { isoLocales } from '../constants';

type ValidatorFn = (body: unknown, errorMessage?: string) => Promise<unknown>;

const allowedLocaleCodes = isoLocales.map(prop('code'));

const createLocaleSchema = yup
  .object()
  .shape({
    name: yup.string().max(50).nullable(),
    code: yup.string().oneOf(allowedLocaleCodes).required(),
    isDefault: yup.boolean().required(),
  })
  .noUnknown();

const updateLocaleSchema = yup
  .object()
  .shape({
    name: yup.string().min(1).max(50).nullable(),
    isDefault: yup.boolean(),
  })
  .noUnknown();

const validateCreateLocaleInput: ValidatorFn = validateYupSchema(createLocaleSchema);
const validateUpdateLocaleInput: ValidatorFn = validateYupSchema(updateLocaleSchema);

export { validateCreateLocaleInput, validateUpdateLocaleInput };
