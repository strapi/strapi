import { getSsoSettingsChanges, registerSsoSettingsAuditEvents } from '../sso-settings';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerSsoSettingsAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

const withoutLockedRoles = { autoRegister: false, defaultRole: null };
const settings = { ...withoutLockedRoles, ssoLockedRoles: [1, 2] };

describe('SSO settings audit events', () => {
  test('registers sso-settings.update', () => {
    expect(Object.keys(getTransformers())).toEqual(['sso-settings.update']);
  });

  test('sso-settings.update has a resource with no id and carries the changes', () => {
    const changes = { autoRegister: { before: false, after: true } };

    expect(getTransformers()['sso-settings.update']({ changes })).toEqual({
      resource: { type: 'sso-settings' },
      details: { changes },
    });
  });

  describe('getSsoSettingsChanges', () => {
    test('records each changed field', () => {
      expect(
        getSsoSettingsChanges(settings, {
          autoRegister: true,
          defaultRole: 3,
          ssoLockedRoles: [2, 4],
        })
      ).toEqual({
        autoRegister: { before: false, after: true },
        defaultRole: { before: null, after: 3 },
        ssoLockedRoles: { before: [1, 2], after: [2, 4] },
      });
    });

    test('returns no changes for identical values', () => {
      expect(getSsoSettingsChanges(settings, { ...settings })).toEqual({});
    });

    test('compares ssoLockedRoles as a set', () => {
      expect(getSsoSettingsChanges(settings, { ...settings, ssoLockedRoles: [2, 1] })).toEqual({});
    });

    test('treats numeric and string role ids as the same role', () => {
      expect(
        getSsoSettingsChanges(
          { ...settings, defaultRole: 3 },
          { ...settings, defaultRole: '3', ssoLockedRoles: ['1', '2'] }
        )
      ).toEqual({});
    });

    test('treats null, missing and empty ssoLockedRoles as no locked roles', () => {
      expect(
        getSsoSettingsChanges(
          { ...settings, ssoLockedRoles: null },
          { ...settings, ssoLockedRoles: [] }
        )
      ).toEqual({});
      expect(
        getSsoSettingsChanges({ ...settings, ssoLockedRoles: [] }, withoutLockedRoles)
      ).toEqual({});
    });

    test('records null for a missing value that changed', () => {
      expect(getSsoSettingsChanges(settings, withoutLockedRoles)).toEqual({
        ssoLockedRoles: { before: [1, 2], after: null },
      });
    });

    test('records ssoLockedRoles sorted', () => {
      expect(
        getSsoSettingsChanges(
          { ...settings, ssoLockedRoles: [10, 2] },
          { ...settings, ssoLockedRoles: [16, 15] }
        )
      ).toEqual({ ssoLockedRoles: { before: [2, 10], after: [15, 16] } });
    });

    test('records numeric string role ids as numbers', () => {
      expect(
        getSsoSettingsChanges(
          { ...settings, defaultRole: '2', ssoLockedRoles: ['3', '2'] },
          { ...settings, defaultRole: '3', ssoLockedRoles: ['3'] }
        )
      ).toEqual({
        defaultRole: { before: 2, after: 3 },
        ssoLockedRoles: { before: [2, 3], after: [3] },
      });
    });

    test('ignores fields outside the three options', () => {
      expect(getSsoSettingsChanges(settings, { ...settings, extra: true } as any)).toEqual({});
    });
  });
});
