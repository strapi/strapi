import { describe, expect, it } from 'vitest';

import { USER_UID } from '../../constants';
import policies from '../index';
import { hasTwoFactor } from '../has-two-factor';
import { NOT_SIGNED_IN, endUser, refusal, requestOf, strapiWith } from './end-user-policies';

describe('plugin::end-users.has-two-factor', () => {
  it('is the plugin`s policy of that name', () => {
    expect(policies['has-two-factor']).toBe(hasTwoFactor);
    expect(hasTwoFactor.name).toBe('plugin::end-users.has-two-factor');
  });

  it('passes a user whose row says two-factor authentication is on, read by their documentId', async () => {
    const options = strapiWith({ userRow: { twoFactorEnabled: true } });

    await expect(
      hasTwoFactor.handler(requestOf(endUser({ passedSecondFactor: true })), {}, options)
    ).resolves.toBe(true);
    expect(options.query).toHaveBeenCalledWith(USER_UID);
    expect(options.query(USER_UID).findOne).toHaveBeenCalledWith({
      where: { documentId: 'user-doc-1' },
      select: ['twoFactorEnabled'],
    });
  });

  it('refuses a user without it, and one whose row is gone, with the strategy`s code', async () => {
    for (const userRow of [{ twoFactorEnabled: false }, { twoFactorEnabled: null }, {}, null]) {
      await expect(
        hasTwoFactor.handler(requestOf(endUser()), {}, strapiWith({ userRow }))
      ).rejects.toThrow(refusal('TWO_FACTOR_REQUIRED'));
    }

    await expect(
      hasTwoFactor.handler(requestOf(endUser()), {}, strapiWith({ userRow: {} }))
    ).rejects.toThrow('Enable two-factor authentication to do this.');
  });

  it('refuses a session that did not pass a second factor, whatever the row says', async () => {
    const options = strapiWith({ userRow: { twoFactorEnabled: true } });

    for (const passedSecondFactor of [false, undefined]) {
      await expect(
        hasTwoFactor.handler(requestOf(endUser({ passedSecondFactor })), {}, options)
      ).rejects.toThrow(refusal('TWO_FACTOR_REQUIRED'));
    }

    await expect(
      hasTwoFactor.handler(requestOf(endUser({ passedSecondFactor: false })), {}, options)
    ).rejects.toThrow('Sign in again with your second factor');
  });

  it.each(Object.entries(NOT_SIGNED_IN))(
    'refuses a caller with %s, before reading anything',
    async (_caller, request) => {
      const options = strapiWith({ userRow: { twoFactorEnabled: true } });

      await expect(hasTwoFactor.handler(request, {}, options)).rejects.toThrow(
        refusal('AUTHENTICATION_REQUIRED')
      );
      expect(options.query).not.toHaveBeenCalled();
    }
  );
});
