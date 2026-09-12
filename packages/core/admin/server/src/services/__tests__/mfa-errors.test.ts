import { errors } from '@strapi/utils';
import { MfaLockedError, MfaRequiredError } from '../mfa-errors';

describe('mfa errors', () => {
  test('MfaLockedError is a PolicyError (and so a ForbiddenError) with a stable name and message', () => {
    const error = new MfaLockedError();
    expect(error).toBeInstanceOf(errors.PolicyError);
    expect(error).toBeInstanceOf(errors.ForbiddenError);
    expect(error).toBeInstanceOf(errors.ApplicationError);
    expect(error.name).toBe('MfaLockedError');
    expect(error.message).toBe(
      'This account is locked because two-factor authentication was not set up in time. Ask an administrator to unlock it.'
    );
  });

  test('MfaRequiredError is a PolicyError (and so a ForbiddenError) with a stable name', () => {
    const error = new MfaRequiredError();
    expect(error).toBeInstanceOf(errors.PolicyError);
    expect(error).toBeInstanceOf(errors.ForbiddenError);
    expect(error.name).toBe('MfaRequiredError');
  });
});
