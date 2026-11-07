import { describe, expect, it } from 'vitest';

import { mapAuthError, upError } from '../errors';

describe('compat errors', () => {
  it('upError builds the Strapi envelope', () => {
    expect(upError('ForbiddenError', 'Forbidden')).toEqual({
      data: null,
      error: { status: 403, name: 'ForbiddenError', message: 'Forbidden', details: {} },
    });
    expect(upError('ValidationError', 'Bad', { errors: [] }).error).toMatchObject({
      status: 400,
      details: { errors: [] },
    });
    expect(upError('UnauthorizedError', 'x').error.status).toBe(401);
    expect(upError('NotFoundError', 'x').error.status).toBe(404);
  });

  it('mapAuthError returns the users-permissions text for each mapped code and null for others', () => {
    expect(mapAuthError('INVALID_EMAIL_OR_PASSWORD')?.message).toBe(
      'Invalid identifier or password'
    );
    expect(mapAuthError('EMAIL_NOT_VERIFIED')?.message).toBe('Your account email is not confirmed');
    expect(mapAuthError('USER_BANNED')?.message).toBe(
      'Your account has been blocked by an administrator'
    );
    expect(mapAuthError('INVALID_PASSWORD')?.message).toBe(
      'The provided current password is invalid'
    );
    expect(mapAuthError('INVALID_TOKEN')).toEqual({
      name: 'ApplicationError',
      message: 'Incorrect code provided',
    });
    expect(mapAuthError('ACCOUNT_LOCKED')).toBeNull();
    expect(mapAuthError('toString')).toBeNull();
  });
});
