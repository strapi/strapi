import type { FormLayoutInputProps } from '../../../../../../../../admin/src/types/forms';

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
            label: {
              id: 'Settings.permissions.users.form.sso',
              defaultMessage: 'Connect with SSO',
            },
            name: 'useSSORegistration',
            type: 'boolean' as const,
            size: 6,
          },
        ],
      ]
    : []),
] satisfies FormLayoutInputProps[][];
