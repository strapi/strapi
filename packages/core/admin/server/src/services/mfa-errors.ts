import { errors } from '@strapi/utils';

/**
 * Thrown by the session-issuing paths for a required, unenrolled user whose grace period has
 * expired. Extends `PolicyError`, not `ForbiddenError` directly: `@strapi/core`'s authorize
 * middleware (`services/server/compose-endpoint.ts`) wraps every policy *and controller action*
 * for every route and converts any other `ForbiddenError` thrown downstream into a bare
 * `ctx.forbidden()` -- discarding its `name` and `message` entirely. `PolicyError` is the one
 * subclass that middleware exempts, letting a publicly visible message through instead (the same
 * exemption `packages/core/content-type-builder/server/src/middlewares/is-development-mode.ts`
 * already relies on). Still a 403, not 401: `@strapi/core` maps status by `instanceof`, and
 * `PolicyError` is itself a `ForbiddenError`; the admin panel's fetch client treats a 401 on
 * `/admin/reset-password` as an expired session and logs the user out before any message could
 * render. Thrown only after the credential has been verified, so it reveals nothing to a guesser
 * that a successful login would not. The login screen keys on `name`, which is why it is set
 * explicitly below rather than left at `PolicyError`'s own default. `PolicyError`'s own `name`
 * field is typed as the fixed literal `'PolicyError'`, so a subclass cannot *declare* a wider
 * `name: string` and then assign a different literal to it -- TypeScript rejects that as an
 * incompatible property override (TS2416) regardless of `declare`, since it would let a
 * `PolicyError`-typed reference observe a `name` other than `'PolicyError'`. `Object.defineProperty`
 * sidesteps this: it sets the same own property an ordinary `this.name = ...` would, without going
 * through a class field declaration or an assignment TypeScript can check against the inherited
 * literal type.
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
