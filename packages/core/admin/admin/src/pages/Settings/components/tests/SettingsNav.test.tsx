import { render } from '@tests/utils';

import { SettingsNav, SettingsNavProps } from '../SettingsNav';

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
] satisfies SettingsNavProps['menu'];

describe('SettingsNav', () => {
  it('should render and match snapshot', () => {
    const { getByText } = render(<SettingsNav menu={menu} />);

    menu.forEach((menuItem) => {
      expect(getByText(menuItem.intlLabel.defaultMessage)).toBeInTheDocument();

      if (menuItem.links) {
        menuItem.links.forEach((link) => {
          expect(getByText(link.intlLabel.defaultMessage)).toBeInTheDocument();
        });
      }
    });
  });
});
