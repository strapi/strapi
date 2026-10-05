import { lightTheme } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { SettingsNav } from '../SettingsNav';

let mockLicense: unknown = { features: [] };

jest.mock('../../../../../../ee/admin/src/hooks/useLicenseLimits', () => ({
  useLicenseLimits: jest.fn(() => ({ license: mockLicense })),
}));

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
        intlLabel: { id: 'Settings.webhooks.title', defaultMessage: 'Webhooks' },
        to: '/settings/webhooks',
        id: 'webhooks',
        isDisplayed: true,
        permissions: [],
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
    id: 'audit',
    intlLabel: { id: 'Settings.audit', defaultMessage: 'Audit' },
    links: [
      {
        intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
        to: '/settings/audit-logs',
        id: 'auditLogs',
        isDisplayed: true,
        licenseOnly: true,
        permissions: [],
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

const lightningFillFor = (label: string) =>
  // eslint-disable-next-line testing-library/no-node-access
  screen.getByText(label).closest('a')?.querySelector('svg')?.getAttribute('fill');

describe('SettingsNav', () => {
  afterEach(() => {
    mockLicense = { features: [] };
  });

  it('marks a feature as licensed when a lapsed license granted it', () => {
    // After expiry the live feature list is empty; the nav follows the same grant the Plan card
    // shows until the license key or file is removed.
    mockLicense = {
      features: [],
      planEntitlements: [{ feature: 'audit-logs', available: true, limits: [] }],
    };

    render(<SettingsNav />);

    expect(lightningFillFor('Audit Logs')).toBe(lightTheme.colors.primary600);
  });

  it('leaves a feature unmarked when the license never granted it', () => {
    mockLicense = {
      features: [],
      planEntitlements: [{ feature: 'audit-logs', available: false, limits: [] }],
    };

    render(<SettingsNav />);

    expect(lightningFillFor('Audit Logs')).toBe(lightTheme.colors.neutral300);
  });

  it('marks a feature on the live license as licensed', () => {
    mockLicense = { features: [{ name: 'audit-logs' }] };

    render(<SettingsNav />);

    expect(lightningFillFor('Audit Logs')).toBe(lightTheme.colors.primary600);
  });

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
});
