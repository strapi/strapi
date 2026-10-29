import { getProjectSettingsChanges, registerProjectSettingsAuditEvents } from '../project-settings';

const getTransformers = () => {
  const transformers: Record<string, (...args: any[]) => any> = {};

  registerProjectSettingsAuditEvents({
    registerEvent(name: string, transform: any) {
      transformers[name] = transform;
    },
  });

  return transformers;
};

const logo = (name: string, hash: string) => ({ name, hash, url: `/uploads/${hash}.png` });

describe('Project settings audit events', () => {
  test('registers project-settings.update', () => {
    expect(Object.keys(getTransformers())).toEqual(['project-settings.update']);
  });

  test('project-settings.update has a resource with no id and carries the changes', () => {
    const changes = { menuLogo: { before: null, after: 'logo.png' } };

    expect(getTransformers()['project-settings.update']({ changes })).toEqual({
      resource: { type: 'project-settings' },
      details: { changes },
    });
  });

  describe('getProjectSettingsChanges', () => {
    test('records an uploaded logo by name', () => {
      expect(
        getProjectSettingsChanges(
          { menuLogo: logo('old.png', 'old_1'), authLogo: null },
          { menuLogo: logo('new.png', 'new_1'), authLogo: null }
        )
      ).toEqual({ menuLogo: { before: 'old.png', after: 'new.png' } });
    });

    test('records a reset logo as null', () => {
      expect(
        getProjectSettingsChanges(
          { menuLogo: null, authLogo: logo('auth.png', 'auth_1') },
          { menuLogo: null, authLogo: null }
        )
      ).toEqual({ authLogo: { before: 'auth.png', after: null } });
    });

    test('records both logos', () => {
      expect(
        getProjectSettingsChanges(undefined, {
          menuLogo: logo('menu.png', 'menu_1'),
          authLogo: logo('auth.png', 'auth_1'),
        })
      ).toEqual({
        menuLogo: { before: null, after: 'menu.png' },
        authLogo: { before: null, after: 'auth.png' },
      });
    });

    test('records a new upload with the same file name', () => {
      expect(
        getProjectSettingsChanges(
          { menuLogo: logo('logo.png', 'logo_1') },
          { menuLogo: logo('logo.png', 'logo_2') }
        )
      ).toEqual({ menuLogo: { before: 'logo.png', after: 'logo.png' } });
    });

    test('returns no changes when the logos are kept', () => {
      const settings = { menuLogo: logo('menu.png', 'menu_1'), authLogo: null };

      expect(getProjectSettingsChanges(settings, { ...settings })).toEqual({});
      expect(getProjectSettingsChanges(null, { menuLogo: null, authLogo: null })).toEqual({});
    });

    test('treats a stored empty logo as no logo', () => {
      expect(getProjectSettingsChanges(null, { menuLogo: {}, authLogo: {} })).toEqual({});
    });
  });
});
