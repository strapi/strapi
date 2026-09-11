import { errors } from '@strapi/utils';

/**
 * Thrown by the session-issuing paths for a required, unenrolled user whose grace period has
 * expired.
 *
 * `PolicyError`, not `ForbiddenError`: `@strapi/core`'s authorize middleware
 * (`services/server/compose-endpoint.ts`) collapses any other `ForbiddenError` thrown downstream
 * into a bare `ctx.forbidden()`, discarding `name` and `message`. `PolicyError` is the one
 * subclass it exempts, so the message reaches the login screen -- the same exemption
 * `content-type-builder`'s `is-development-mode` middleware relies on. It is still a 403: a 401 on
 * an admin route makes the panel's fetch client log the user out before any message could render.
 *
 * The login screen keys on `name`, which `PolicyError` types as the fixed literal `'PolicyError'`
 * -- a subclass cannot redeclare it wider, so TypeScript rejects the assignment (TS2416).
 * `Object.defineProperty` sets the same own property without a declaration to check.
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

/**
 * Thrown by `POST /mfa/disable` while the caller is required to have two-factor authentication.
 * Extends `PolicyError` for the same reason as `MfaLockedError` above: it is the one
 * `ForbiddenError` subclass `@strapi/core`'s authorize middleware lets through with its own name
 * and message, rather than collapsing into a bare `ctx.forbidden()`. See that class's comment for
 * why `name` is set via `Object.defineProperty` rather than a plain assignment.
 */
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
