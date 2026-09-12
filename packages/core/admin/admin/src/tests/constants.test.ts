import { ADMIN_PERMISSIONS_CE, SETTINGS_LINKS_CE } from '../constants';

describe('SETTINGS_LINKS_CE', () => {
  const originalFuture = window.strapi.future;

  afterEach(() => {
    window.strapi.future = originalFuture;
  });

  it('lists the Security link under Administration Panel when unstableAdminMfa is on', () => {
    window.strapi.future = { isEnabled: (name) => name === 'unstableAdminMfa' };

    const link = SETTINGS_LINKS_CE().admin.find((l) => l.id === 'security');

    expect(link).toEqual({
      intlLabel: { id: 'Settings.security.title', defaultMessage: 'Security' },
      to: '/settings/security',
      id: 'security',
    });
    // useSettingsMenu resolves a link's permissions by `permissions.settings[link.id].main`,
    // seeded from this constant
    expect(ADMIN_PERMISSIONS_CE.settings.security.main).toEqual([
      { action: 'admin::security-settings.read', subject: null },
    ]);
  });

  it('omits the Security link when the flag is off', () => {
    window.strapi.future = { isEnabled: () => false };

    expect(SETTINGS_LINKS_CE().admin.find((l) => l.id === 'security')).toBeUndefined();
  });
});
