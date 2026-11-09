import type { CompatResult } from './types';

export type UpErrorName =
  | 'ApplicationError'
  | 'BadRequestError'
  | 'ValidationError'
  | 'ForbiddenError'
  | 'UnauthorizedError'
  | 'NotFoundError';

const STATUS: Record<UpErrorName, number> = {
  ApplicationError: 400,
  BadRequestError: 400,
  ValidationError: 400,
  ForbiddenError: 403,
  UnauthorizedError: 401,
  NotFoundError: 404,
};

/** The envelope Strapi (and so users-permissions) answers an error with. */
export const upError = (name: UpErrorName, message: string, details: unknown = {}) => ({
  data: null,
  error: { status: STATUS[name], name, message, details },
});

const NAME_BY_STATUS: Readonly<Record<number, UpErrorName>> = {
  403: 'ForbiddenError',
  401: 'UnauthorizedError',
};

/**
 * An engine refusal that has no users-permissions text, in Strapi's envelope with the engine's own
 * status and message, and its code in `details.code` (a locked account is a 403 `ForbiddenError`
 * with `ACCOUNT_LOCKED`). The name follows the status: 403 and 401 have their own, anything else
 * is an `ApplicationError`.
 */
export const engineErrorBody = (status: number, message: string, code: string) => {
  const name = NAME_BY_STATUS[status] ?? 'ApplicationError';

  return {
    data: null,
    error: { status, name, message, details: { code } },
  };
};

/**
 * Engine error codes that users-permissions answered with its own text, as a 400 `ApplicationError`.
 * Any other code is not mapped: `engineErrorBody` gives it the status and code the engine gave it.
 * The identifier and body checks of the sign-in are in here too: whatever form a bad identifier
 * takes, the answer is the one a wrong password gets.
 */
const AUTH_ERRORS: Readonly<Record<string, string>> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid identifier or password',
  INVALID_USERNAME_OR_PASSWORD: 'Invalid identifier or password',
  INVALID_EMAIL: 'Invalid identifier or password',
  VALIDATION_ERROR: 'Invalid identifier or password',
  EMAIL_NOT_VERIFIED: 'Your account email is not confirmed',
  USER_BANNED: 'Your account has been blocked by an administrator',
  BANNED_USER: 'Your account has been blocked by an administrator',
  INVALID_PASSWORD: 'The provided current password is invalid',
  INVALID_TOKEN: 'Incorrect code provided',
  USER_ALREADY_EXISTS: 'Email or Username are already taken',
  USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Email or Username are already taken',
  USERNAME_IS_ALREADY_TAKEN: 'Email or Username are already taken',
};

/** The texts of the register route, which users-permissions answered with as a 400. */
export const REGISTER_DISABLED = 'Register action is currently disabled';
export const EMAIL_OR_USERNAME_TAKEN = 'Email or Username are already taken';
export const invalidParameters = (keys: ReadonlyArray<string>): string =>
  `Invalid parameters: ${keys.join(', ')}`;

/** The 400 users-permissions gave a body that lacks a required field. */
export const missingFieldBody = (field: string) =>
  upError('ValidationError', `${field} is a required field`, {
    errors: [{ path: [field], name: 'ValidationError', message: `${field} is a required field` }],
  });

export const mapAuthError = (code: string): { name: UpErrorName; message: string } | null => {
  const message = Object.prototype.hasOwnProperty.call(AUTH_ERRORS, code)
    ? AUTH_ERRORS[code]
    : undefined;

  return message === undefined ? null : { name: 'ApplicationError', message };
};

/** What the engine threw, when it threw one of its own (`statusCode` and a `body` with a `code`). */
export const engineRefusal = (error: unknown) => {
  const { statusCode, body } = (error ?? {}) as {
    statusCode?: unknown;
    body?: { code?: unknown; message?: unknown };
  };

  if (typeof statusCode !== 'number' || typeof body?.code !== 'string') {
    return null;
  }

  return {
    status: statusCode,
    code: body.code,
    message: typeof body.message === 'string' ? body.message : body.code,
  };
};

/**
 * An engine refusal as the answer of a compat route, or `null` when the error is not one of the
 * engine's (the caller rethrows it). A code in `texts` gets that text as a 400 `ApplicationError`,
 * then a code users-permissions answered with its own text gets that; any other is Strapi's error
 * envelope with the engine's status, message and code.
 */
export const refusalResult = (
  error: unknown,
  texts: Readonly<Record<string, string>> = {}
): CompatResult | null => {
  const refusal = engineRefusal(error);

  if (refusal === null) {
    return null;
  }

  if (Object.prototype.hasOwnProperty.call(texts, refusal.code)) {
    return { status: 400, body: upError('ApplicationError', texts[refusal.code]) };
  }

  const mapped = mapAuthError(refusal.code);

  return mapped === null
    ? {
        status: refusal.status,
        body: engineErrorBody(refusal.status, refusal.message, refusal.code),
      }
    : { status: 400, body: upError(mapped.name, mapped.message) };
};

export const PASSWORDS_DO_NOT_MATCH = 'Passwords do not match';
export const INVALID_CONFIRMATION_TOKEN = 'Invalid token';
