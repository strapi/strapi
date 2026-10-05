import { describe, expect, test, vi } from 'vitest';
import {
  validateRegisterBody,
  validateResetPasswordBody,
  validateChangePasswordBody,
} from '../auth';

const validators = [
  ['registration', validateRegisterBody, { username: 'alice', email: 'alice@example.com' }],
  ['password reset', validateResetPasswordBody, { code: 'reset-token' }],
  ['password change', validateChangePasswordBody, { currentPassword: 'old-password' }],
] as const;

describe.each(validators)('%s password validation', (_description, validate, payload) => {
  const body = { ...payload, password: 'new-password', passwordConfirmation: 'new-password' };

  test('awaits asynchronous password policies', async () => {
    const validatePassword = vi.fn().mockResolvedValue(false);
    await expect(validate(body, { validatePassword })).rejects.toThrow(
      'Password validation failed.'
    );
    expect(validatePassword).toHaveBeenCalledWith('new-password');
  });

  test('preserves an error message from the password policy', async () => {
    await expect(
      validate(body, {
        validatePassword() {
          throw new Error('Password appeared in a breach');
        },
      })
    ).rejects.toThrow('Password appeared in a breach');
  });

  test('preserves messages thrown by custom policies as plain error objects', async () => {
    await expect(
      validate(body, {
        validatePassword: vi.fn().mockRejectedValue({ message: 'Custom policy failed' }),
      })
    ).rejects.toThrow('Custom policy failed');
  });

  test('provides a safe fallback for policy errors without messages', async () => {
    await expect(
      validate(body, {
        validatePassword() {
          throw new Error();
        },
      })
    ).rejects.toThrow('An error occurred.');
  });
});
