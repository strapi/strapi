/* eslint-env jest */

/**
 * Coverage for the cycle 4 `passkeysSchema` folded into `updateSecuritySettingsSchema`, and for
 * the validation layer's own copy of the `'Provide mfa, trustedDevices or passkeys'` message.
 *
 * `mfa` and `trustedDevices` never had validation-level tests either -- this file does not close
 * that pre-existing gap, it only exercises the schema this task added, through the exported
 * `validateUpdateSecuritySettings`, the same entry point the controller calls (`passkeysSchema`
 * itself is not exported, so there is no way to unit-test it in isolation).
 */
import { validateUpdateSecuritySettings } from '../security-settings';

const messagesOf = async (value: unknown): Promise<string[]> => {
  try {
    await validateUpdateSecuritySettings(value);
    throw new Error('Expected validation to reject, but it resolved');
  } catch (e: any) {
    const errors = e?.details?.errors ?? [];
    return errors.map((err: { message: string }) => err.message);
  }
};

describe('security settings validation: passkeysSchema', () => {
  test('accepts a valid { enabled: boolean } passkeys object', async () => {
    await expect(validateUpdateSecuritySettings({ passkeys: { enabled: true } })).resolves.toEqual({
      passkeys: { enabled: true },
    });
    await expect(validateUpdateSecuritySettings({ passkeys: { enabled: false } })).resolves.toEqual(
      { passkeys: { enabled: false } }
    );
  });

  test('rejects an unknown key inside passkeys', async () => {
    const messages = await messagesOf({ passkeys: { enabled: true, foo: 1 } });
    expect(messages.some((m) => /passkeys field has unspecified keys.*foo/.test(m))).toBe(true);
  });

  test('rejects a non-boolean enabled rather than coercing it (strict mode)', async () => {
    const messages = await messagesOf({ passkeys: { enabled: 'yes' } });
    expect(messages.some((m) => /passkeys\.enabled must be a `boolean` type/.test(m))).toBe(true);
  });

  test('pins the shared "provide one of the three objects" message', async () => {
    const messages = await messagesOf({ password: 'pw' });
    expect(messages).toContain('Provide mfa, trustedDevices or passkeys');
  });
});
