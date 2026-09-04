import { errors } from '@strapi/utils';

/**
 * Thrown by the session-issuing paths for a required, unenrolled user whose grace period has
 * expired. A `ForbiddenError` (403), not 401: `@strapi/core` maps status by `instanceof`, and the
 * admin panel's fetch client treats a 401 on `/admin/reset-password` as an expired session and
 * logs the user out before any message could render. Thrown only after the credential has been
 * verified, so it reveals nothing to a guesser that a successful login would not. The login screen
 * keys on `name`.
 */
export class MfaLockedError extends errors.ForbiddenError<'MfaLockedError'> {
  constructor() {
    super(
      'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.'
    );
    this.name = 'MfaLockedError';
  }
}

/**
 * Thrown by `POST /mfa/disable` while the caller is required to have two-factor authentication.
 */
export class MfaRequiredError extends errors.ForbiddenError<'MfaRequiredError'> {
  constructor() {
    super('Two-factor authentication is required for your account and cannot be disabled.');
    this.name = 'MfaRequiredError';
  }
}
