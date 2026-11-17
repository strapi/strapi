import { lightTheme } from '@strapi/design-system';
import { render, screen } from '@tests/utils';

import { SettingsNav } from '../SettingsNav';

const originalIsTrial = window.strapi.isTrial;
const originalIsEnabled = window.strapi.features.isEnabled;

const setLicense = ({ isTrial, features }: { isTrial: boolean; features: string[] }) => {
  window.strapi.isTrial = isTrial;
  window.strapi.features.isEnabled = (name) => features.includes(name ?? '');
};

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
      {
        intlLabel: { id: 'content-releases.plugin.name', defaultMessage: 'Releases' },
        to: '/settings/releases',
        id: 'content-releases',
        isDisplayed: true,
        licenseOnly: true,
        licenseFeature: 'cms-content-releases',
        permissions: [],
      },
      {
        intlLabel: { id: 'review-workflows.plugin.name', defaultMessage: 'Review Workflows' },
        to: '/settings/review-workflows',
        id: 'review-workflows',
        isDisplayed: true,
        licenseOnly: true,
        licenseFeature: 'review-workflows',
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
        licenseFeature: 'audit-logs',
        permissions: [],
      },
    ],
  },
  {
    id: 'purchase',
    intlLabel: { id: 'Settings.purchase', defaultMessage: 'Purchase' },
    links: [
      {
        intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
        to: '/settings/purchase-single-sign-on',
        id: 'sso-purchase-page',
        isDisplayed: true,
        licenseOnly: true,
        licenseFeature: 'sso',
        permissions: [],
      },
      {
        intlLabel: { id: 'Settings.content-history.title', defaultMessage: 'Content History' },
        to: '/settings/purchase-content-history',
        id: 'content-history-purchase-page',
        isDisplayed: true,
        licenseOnly: true,
        licenseFeature: 'cms-content-history',
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
  screen.getByText(label).closest('a')?.querySelector('svg')?.getAttribute('fill');

describe('SettingsNav', () => {
  afterEach(() => {
    window.strapi.isTrial = originalIsTrial;
    window.strapi.features.isEnabled = originalIsEnabled;
  });

  it('marks the features the trial grants in purple and the rest in grey', () => {
    setLicense({ isTrial: true, features: ['cms-content-releases', 'sso'] });

    render(<SettingsNav />);

    expect(lightningFillFor('Releases')).toBe(lightTheme.colors.primary600);
    expect(lightningFillFor('Single Sign-On')).toBe(lightTheme.colors.primary600);
    expect(lightningFillFor('Review Workflows')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Audit Logs')).toBe(lightTheme.colors.neutral300);
  });

  it('shows no icon on the features a paid license grants', () => {
    setLicense({
      isTrial: false,
      features: ['cms-content-releases', 'review-workflows', 'sso', 'audit-logs'],
    });

    render(<SettingsNav />);

    expect(lightningFillFor('Releases')).toBeUndefined();
    expect(lightningFillFor('Review Workflows')).toBeUndefined();
    expect(lightningFillFor('Single Sign-On')).toBeUndefined();
    expect(lightningFillFor('Audit Logs')).toBeUndefined();
  });

  it('marks the features a paid license does not grant in grey', () => {
    setLicense({ isTrial: false, features: ['cms-content-releases'] });

    render(<SettingsNav />);

    expect(lightningFillFor('Releases')).toBeUndefined();
    expect(lightningFillFor('Single Sign-On')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Review Workflows')).toBe(lightTheme.colors.neutral300);
  });

  it('marks every paid feature in grey without a license', () => {
    setLicense({ isTrial: false, features: [] });

    render(<SettingsNav />);

    expect(lightningFillFor('Releases')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Review Workflows')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Single Sign-On')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Audit Logs')).toBe(lightTheme.colors.neutral300);
    expect(lightningFillFor('Content History')).toBe(lightTheme.colors.neutral300);
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
