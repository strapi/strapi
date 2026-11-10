import { validateYupSchema, yup } from '@strapi/utils';

import { isPlain } from '../utils/is-plain';

/** The body of a write to the caller's own profile: `{ data: { ... } }` */
const profileBodySchema = yup
  .mixed()
  .nullable()
  .test('data', 'Missing "data" payload in the request body', (value) => {
    return isPlain(value) && isPlain(value.data);
  });

export const validateProfileBody = validateYupSchema(profileBodySchema, { abortEarly: true });
