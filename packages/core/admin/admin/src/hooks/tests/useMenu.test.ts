import { Cog, House } from '@strapi/icons';

import {
  dismissUpgradeBanner,
  REMIND_LATER_AT_KEY,
} from '../../pages/Settings/pages/ApplicationInfo/utils/upgradeBannerStorage';
import { getGeneralLinks, normalizeMenuLinks } from '../useMenu';

describe('normalizeMenuLinks', () => {
  it('returns an empty array when menu links are not an array', () => {
    expect(normalizeMenuLinks(undefined)).toEqual([]);
  });

  it('drops malformed menu links and defaults missing permissions', () => {
    expect(
      normalizeMenuLinks([
        undefined,
        {
          to: 'content-manager',
          icon: House,
          intlLabel: {
            id: 'content-manager.plugin.name',
            defaultMessage: 'Content Manager',
          },
        },
        {
          to: 'missing-icon',
          intlLabel: {
            id: 'missing-icon',
            defaultMessage: 'Missing icon',
          },
        },
      ])
    ).toEqual([
      {
        to: 'content-manager',
        icon: House,
        intlLabel: {
          id: 'content-manager.plugin.name',
          defaultMessage: 'Content Manager',
        },
        permissions: [],
      },
    ]);
  });
});

describe('getGeneralLinks', () => {
  const settingsLink = {
    to: '/settings',
    icon: Cog,
    intlLabel: { id: 'global.settings', defaultMessage: 'Settings' },
    permissions: [],
  };
  const checkUserHasPermissions = jest.fn(async () => [{ action: 'read', subject: null }]);

  beforeEach(() => {
    window.localStorage.clear();
  });

  it('keeps the warning badge on Settings after the upgrade banner is dismissed', async () => {
    dismissUpgradeBanner({ severity: 'urgent', latestVersion: 'v5.11.0', scope: 'project-uuid' });
    expect(window.localStorage.getItem(`${REMIND_LATER_AT_KEY}:project-uuid`)).not.toBeNull();

    const [settings] = await getGeneralLinks([settingsLink], 'urgent', checkUserHasPermissions);

    expect(settings.notificationsCount).toBe(1);
    expect(settings.notificationsVariant).toBe('warning');
  });

  it('shows no badge when Strapi is up to date', async () => {
    const [settings] = await getGeneralLinks([settingsLink], 'none', checkUserHasPermissions);

    expect(settings.notificationsCount).toBe(0);
  });
});
