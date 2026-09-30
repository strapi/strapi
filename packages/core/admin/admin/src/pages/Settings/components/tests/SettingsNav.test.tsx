import { lightTheme } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { SettingsNav } from '../SettingsNav';

const menu = [
  {
    id: 'global',
    intlLabel: { id: 'Settings.global', defaultMessage: 'Global Settings' },
    links: [
      {
        intlLabel: { id: 'Settings.application.title', defaultMessage: 'Overview' },
        to: '/settings/application-infos',
        id: '000-application-infos',
        isDisplayed: true,
        permissions: [],
        hasNotification: true,
      },
      {
        intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
        to: '/settings/single-sign-on',
        id: 'sso',
        isDisplayed: true,
        permissions: [],
        licenseOnly: true,
      },
    ],
  },
  {
    id: 'permissions',
    intlLabel: { id: 'Settings.permissions', defaultMessage: 'Administration Panel' },
    links: [
      {
        intlLabel: { id: 'global.roles', defaultMessage: 'Roles' },
        to: '/settings/roles',
        id: 'roles',
        isDisplayed: true,
        permissions: [
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'admin::roles.create',
            subject: null,
          },
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'admin::roles.update',
            subject: null,
          },
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'admin::roles.read',
            subject: null,
          },
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'admin::roles.delete',
            subject: null,
          },
        ],
      },
    ],
  },
  {
    id: 'email',
    intlLabel: { id: 'email.SettingsNav.section-label', defaultMessage: 'Email Plugin' },
    links: [
      {
        intlLabel: { id: 'email.Settings.email.plugin.title', defaultMessage: 'Email Settings' },
        id: 'settings',
        to: '/settings/email',
        permissions: [
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'plugin::email.settings.read',
            subject: null,
          },
        ],
        isDisplayed: true,
      },
    ],
  },
  {
    id: 'users-permissions',
    intlLabel: {
      id: 'users-permissions.Settings.section-label',
      defaultMessage: 'Users & Permissions plugin',
    },
    links: [
      {
        intlLabel: { id: 'users-permissions.HeaderNav.link.roles', defaultMessage: 'U&P Roles' },
        id: 'roles',
        to: '/settings/users-permissions/roles',
        permissions: [
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'plugin::users-permissions.roles.create',
            subject: null,
          },
          {
            id: 1,
            actionParameters: {},
            properties: {},
            conditions: [],
            action: 'plugin::users-permissions.roles.read',
            subject: null,
          },
        ],
        isDisplayed: true,
      },
    ],
  },
];

jest.mock('../../../../hooks/useSettingsMenu', () => ({
  useSettingsMenu: jest.fn(() => ({
    menu,
  })),
}));

describe('SettingsNav', () => {
  it('should render and match snapshot', () => {
    const { getByText } = render(<SettingsNav />);

    menu.forEach((menuItem) => {
      expect(getByText(menuItem.intlLabel.defaultMessage)).toBeInTheDocument();

      if (menuItem.links) {
        menuItem.links.forEach((link) => {
          expect(getByText(link.intlLabel.defaultMessage)).toBeInTheDocument();
        });
      }
    });
  });

  describe('license marker', () => {
    const originalIsEE = window.strapi.isEE;
    const originalIsEnabled = window.strapi.features.isEnabled;

    beforeEach(() => {
      window.strapi.isEE = true;
    });

    afterEach(() => {
      window.strapi.isEE = originalIsEE;
      window.strapi.features.isEnabled = originalIsEnabled;
    });

    const getLightningFill = () =>
      screen
        .getByRole('link', { name: 'Single Sign-On' })
        .querySelector('svg')
        ?.getAttribute('fill');

    it('highlights a license-only link when its feature is enabled', () => {
      window.strapi.features.isEnabled = (name) => name === 'sso';

      render(<SettingsNav />);

      expect(getLightningFill()).toBe(lightTheme.colors.primary600);
    });

    it('greys out a license-only link when the license lacks its feature', () => {
      window.strapi.features.isEnabled = () => false;

      render(<SettingsNav />);

      expect(getLightningFill()).toBe(lightTheme.colors.neutral300);
    });
  });
});
