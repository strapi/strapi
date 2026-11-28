import { errors, policy } from '@strapi/utils';

const { createPolicy } = policy;
const { NotFoundError } = errors;

/** A 404, not the 403 returning `false` gives: a disabled feature must look absent. Being a
 * policy also puts it before body validation, whose 400-vs-404 split would itself be a tell. */
export default createPolicy({
  name: 'admin::isMfaEnabled',
  handler(_ctx, _config, { strapi }) {
    if (!strapi.service('admin::mfa').isEnabled()) {
      throw new NotFoundError();
    }
  },
});
