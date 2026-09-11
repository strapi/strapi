import { errors, policy } from '@strapi/utils';

const { createPolicy } = policy;
const { NotFoundError } = errors;

/**
 * A 404, not the 403 a policy returning `false` gives: a disabled feature must look absent, and
 * 403 says the endpoint is real. Being a policy also puts it before body validation, which would
 * otherwise answer 400 for a malformed body and 404 for a well-formed one -- itself a tell.
 */
export default createPolicy({
  name: 'admin::isMfaEnabled',
  handler(_ctx, _config, { strapi }) {
    if (!strapi.service('admin::mfa').isEnabled()) {
      throw new NotFoundError();
    }
  },
});
