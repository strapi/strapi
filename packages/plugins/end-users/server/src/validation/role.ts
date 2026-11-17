import { validateYupSchema, yup } from '@strapi/utils';

import { isPlain } from '../utils/is-plain';

/**
 * A role's body: the name, description, two-factor rule and permissions are checked by the role
 * service, which knows what a name may be. Here it only has to be an object, and the message is part
 * of the route's answer.
 */
const roleBodySchema = yup
  .mixed()
  .nullable()
  .test('is-object', 'A role is an object', (value) => isPlain(value));

export const validateRoleBody = validateYupSchema(roleBodySchema, { abortEarly: true });
