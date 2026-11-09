import { describe, expect, it } from 'vitest';

import { mapUpAdvanced } from '../map-settings';

const ctx = {
  emailEnabled: true,
  defaultRoleDocumentId: 'role-doc-1',
  isAllowedRedirect: (url: string) => url.startsWith('https://app.test'),
};

describe('mapUpAdvanced', () => {
  it('maps allow_register, email_confirmation, both redirects and the default role, and skips unique_email false', () => {
    expect(
      mapUpAdvanced(
        {
          unique_email: false,
          allow_register: false,
          email_confirmation: true,
          email_reset_password: 'https://app.test/reset',
          email_confirmation_redirection: 'https://app.test/confirmed',
          default_role: 'member',
        },
        ctx
      )
    ).toEqual({
      patch: {
        signUp: { enabled: false, requireEmailVerification: true, defaultRoles: ['role-doc-1'] },
        redirects: {
          passwordReset: 'https://app.test/reset',
          emailVerified: 'https://app.test/confirmed',
        },
      },
      skipped: [{ key: 'unique_email', reason: expect.any(String) }],
    });
  });

  it('skips a redirect whose origin is not allowed', () => {
    const result = mapUpAdvanced(
      {
        email_reset_password: 'https://elsewhere.test/reset',
        email_confirmation_redirection: null,
      },
      { ...ctx, defaultRoleDocumentId: null }
    );

    expect(result.patch).toEqual({});
    expect(result.skipped).toEqual([{ key: 'email_reset_password', reason: expect.any(String) }]);
  });

  it('does not require verification when no email can be sent', () => {
    const result = mapUpAdvanced({ email_confirmation: true }, { ...ctx, emailEnabled: false });

    expect(result.patch.signUp?.requireEmailVerification).toBeUndefined();
    expect(result.skipped).toEqual([{ key: 'email_confirmation', reason: expect.any(String) }]);
  });

  it('reports a default role that was not found, but not the built-in one', () => {
    const none = { ...ctx, defaultRoleDocumentId: null };

    expect(mapUpAdvanced({ default_role: 'ghost' }, none).skipped).toEqual([
      { key: 'default_role', reason: expect.any(String) },
    ]);
    expect(mapUpAdvanced({ default_role: 'authenticated' }, none)).toEqual({
      patch: {},
      skipped: [],
    });
  });

  it('ignores a redirect that is not a string', () => {
    const result = mapUpAdvanced(
      { email_reset_password: 42 as unknown as string },
      { ...ctx, defaultRoleDocumentId: null }
    );

    expect(result).toEqual({ patch: {}, skipped: [] });
  });
});
