import { AuthResponse } from './pages/AuthResponse';

import type { SettingsMenu } from '../../../admin/src/constants';
import type { PermissionMap } from '../../../admin/src/types/permissions';

export const ADMIN_PERMISSIONS_EE = {
  settings: {
    auditLogs: {
      main: [{ action: 'admin::audit-logs.read', subject: null }],
      read: [{ action: 'admin::audit-logs.read', subject: null }],
      update: [{ action: 'admin::audit-logs.update', subject: null }],
    },
    'review-workflows': {
      main: [{ action: 'admin::review-workflows.read', subject: null }],
      read: [{ action: 'admin::review-workflows.read', subject: null }],
      create: [{ action: 'admin::review-workflows.create', subject: null }],
      delete: [{ action: 'admin::review-workflows.delete', subject: null }],
      update: [{ action: 'admin::review-workflows.update', subject: null }],
    },
    sso: {
      main: [{ action: 'admin::provider-login.read', subject: null }],
      read: [{ action: 'admin::provider-login.read', subject: null }],
      update: [{ action: 'admin::provider-login.update', subject: null }],
    },
  },
} satisfies {
  settings: Pick<PermissionMap['settings'], 'auditLogs' | 'review-workflows' | 'sso'>;
};

export const ROUTES_EE = [
  {
    Component: () => ({ default: AuthResponse }),
    to: '/auth/login/:authResponse',
    exact: true,
  },
];

// TODO: the constants.js file is imported before the React application is setup and
// therefore `window.strapi` might not exist at import-time. We should probably define
// which constant is available at which stage of the application lifecycle.
export const SETTINGS_LINKS_EE = (): SettingsMenu => ({
  global: [
    ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
      ? [
          {
            intlLabel: { id: 'Settings.sso.title', defaultMessage: 'Single Sign-On' },
            to: '/settings/single-sign-on',
            id: 'sso',
          },
        ]
      : []),

    ...(window.strapi.features.isEnabled(window.strapi.features.REVIEW_WORKFLOWS)
      ? [
          {
            intlLabel: {
              id: 'Settings.review-workflows.page.title',
              defaultMessage: 'Review Workflows',
            },
            to: '/settings/review-workflows',
            id: 'review-workflows',
          },
        ]
      : []),
  ],

  admin: [
    ...(window.strapi.features.isEnabled(window.strapi.features.AUDIT_LOGS)
      ? [
          {
            intlLabel: { id: 'global.auditLogs', defaultMessage: 'Audit Logs' },
            to: '/settings/audit-logs?pageSize=50&page=1&sort=date:DESC',
            id: 'auditLogs',
          },
        ]
      : []),
  ],
});
