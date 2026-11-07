export type UpErrorName =
  'ApplicationError' | 'ValidationError' | 'ForbiddenError' | 'UnauthorizedError' | 'NotFoundError';

const STATUS: Record<UpErrorName, number> = {
  ApplicationError: 400,
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

/**
 * Engine error codes that users-permissions answered with its own text, as a 400 `ApplicationError`.
 * Any other code is not mapped: it keeps the status and code the engine gave it (a locked account
 * stays a 403 with its code).
 */
const AUTH_ERRORS: Readonly<Record<string, string>> = {
  INVALID_EMAIL_OR_PASSWORD: 'Invalid identifier or password',
  EMAIL_NOT_VERIFIED: 'Your account email is not confirmed',
  USER_BANNED: 'Your account has been blocked by an administrator',
  BANNED_USER: 'Your account has been blocked by an administrator',
  INVALID_PASSWORD: 'The provided current password is invalid',
  INVALID_TOKEN: 'Incorrect code provided',
};

export const mapAuthError = (code: string): { name: UpErrorName; message: string } | null => {
  const message = Object.prototype.hasOwnProperty.call(AUTH_ERRORS, code)
    ? AUTH_ERRORS[code]
    : undefined;

  return message === undefined ? null : { name: 'ApplicationError', message };
};
