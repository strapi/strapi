import { errors, policy } from '@strapi/utils';

const { createPolicy } = policy;
const { NotFoundError } = errors;

/**
 * Refuses every route belonging to admin two-factor authentication while the feature is off --
 * either the `unstableAdminMfa` future flag or the `admin.auth.mfa.enabled` config kill switch.
 *
 * A 404, not the 403 a policy returning `false` would produce: a disabled feature must behave as
 * though its routes do not exist, and 403 tells a caller the endpoint is real and they merely
 * lack permission.
 *
 * Being a policy is what puts it *before* body validation. Validating first would return 400 for
 * a malformed body and 404 for a well-formed one, and that difference is itself a
 * feature-presence tell on a route that is supposed to look absent.
 */
export default createPolicy({
  name: 'admin::isMfaEnabled',
  handler(_ctx, _config, { strapi }) {
    if (!strapi.service('admin::mfa').isEnabled()) {
      throw new NotFoundError();
    }
  },
});
