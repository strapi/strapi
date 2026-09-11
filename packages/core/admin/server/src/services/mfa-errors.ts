import { errors } from '@strapi/utils';

/**
 * `PolicyError`, not `ForbiddenError`: the authorize middleware collapses every other
 * `ForbiddenError` into a bare `ctx.forbidden()`, discarding the message the login screen shows.
 * Still a 403, because a 401 makes the panel's fetch client log the user out first.
 *
 * `name` is set with `defineProperty` because `PolicyError` types it as a fixed literal, which a
 * subclass cannot redeclare (TS2416).
 */
export class MfaLockedError extends errors.PolicyError {
  constructor() {
    super(
      'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.'
    );
    Object.defineProperty(this, 'name', {
      value: 'MfaLockedError',
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}

/** `PolicyError` and `defineProperty` for the reasons `MfaLockedError` above gives. */
export class MfaRequiredError extends errors.PolicyError {
  constructor() {
    super('Two-factor authentication is required for your account and cannot be disabled.');
    Object.defineProperty(this, 'name', {
      value: 'MfaRequiredError',
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }
}
