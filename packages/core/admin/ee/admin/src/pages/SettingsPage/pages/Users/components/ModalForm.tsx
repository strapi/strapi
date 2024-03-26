import type { FormLayout } from '../../../../../../../../admin/src/types/form';

export const FORM_INITIAL_VALUES = {
  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? {
        useSSORegistration: true,
      }
    : {}),
};

export const ROLE_LAYOUT = [
  ...(window.strapi.features.isEnabled(window.strapi.features.SSO)
    ? [
        [
          {
            intlLabel: {
              id: 'Settings.permissions.users.form.sso',
              defaultMessage: 'Connect with SSO',
            },
            name: 'useSSORegistration',
            type: 'bool',
            size: {
              col: 6,
              xs: 12,
            },
          } as const,
        ],
      ]
    : []),
] satisfies FormLayout[][];
