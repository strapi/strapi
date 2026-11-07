import { SecurityPanel } from './components/SecurityPanel/SecurityPanel';
import { EMAIL_TEMPLATES_PATH, EMAIL_TEMPLATES_PERMISSIONS, PERMISSIONS } from './constants';
import { pluginId } from './pluginId';
import { getTranslation } from './utils/getTranslation';
import { prefixPluginTranslations } from './utils/prefixPluginTranslations';

import type { StrapiApp } from '@strapi/admin/strapi-admin';

// eslint-disable-next-line import/no-default-export
export default {
  register(app: StrapiApp) {
    app.addSettingsLink(
      {
        id: pluginId,
        intlLabel: {
          id: getTranslation('Settings.section-label'),
          defaultMessage: 'End users',
        },
      },
      [
        {
          id: 'roles',
          to: `${pluginId}/roles`,
          intlLabel: {
            id: getTranslation('Settings.roles.link'),
            defaultMessage: 'Roles',
          },
          Component: () =>
            import('./pages/Roles/RolesPage').then((mod) => ({ default: mod.RolesPage })),
          permissions: PERMISSIONS.roles.read,
        },
        {
          id: 'conditions',
          to: `${pluginId}/conditions`,
          intlLabel: {
            id: getTranslation('Settings.conditions.link'),
            defaultMessage: 'Conditions',
          },
          Component: () =>
            import('./pages/Conditions/ConditionsPage').then((mod) => ({
              default: mod.ConditionsPage,
            })),
          permissions: PERMISSIONS.conditions.read,
        },
        {
          id: 'sign-in',
          to: `${pluginId}/sign-in`,
          intlLabel: {
            id: getTranslation('Settings.sign-in.link'),
            defaultMessage: 'Sign-in',
          },
          Component: () =>
            import('./pages/SignIn/SignInPage').then((mod) => ({ default: mod.SignInPage })),
          permissions: PERMISSIONS.settings.read,
        },
        {
          id: 'providers',
          to: `${pluginId}/providers`,
          intlLabel: {
            id: getTranslation('Settings.providers.link'),
            defaultMessage: 'Providers',
          },
          Component: () =>
            import('./pages/Providers/ProvidersPage').then((mod) => ({
              default: mod.ProvidersPage,
            })),
          permissions: PERMISSIONS.providers.read,
        },
        {
          id: 'advanced',
          to: `${pluginId}/advanced`,
          intlLabel: {
            id: getTranslation('Settings.advanced.link'),
            defaultMessage: 'Advanced',
          },
          Component: () =>
            import('./pages/Advanced/AdvancedPage').then((mod) => ({
              default: mod.AdvancedPage,
            })),
          permissions: PERMISSIONS.settings.read,
        },
        {
          // The email plugin owns this page and its route: this is only a link to it
          id: 'email-templates',
          to: EMAIL_TEMPLATES_PATH,
          intlLabel: {
            id: getTranslation('Settings.email-templates.link'),
            defaultMessage: 'Email templates',
          },
          permissions: EMAIL_TEMPLATES_PERMISSIONS,
        },
      ]
    );

    app.registerPlugin({
      id: pluginId,
      name: pluginId,
    });
  },
  bootstrap(app: StrapiApp) {
    // The Content Manager's edit view of an end user gets a Security panel (the panel hides itself
    // for every other type)
    const { apis } = app.getPlugin('content-manager');

    if ('addEditViewSidePanel' in apis && typeof apis.addEditViewSidePanel === 'function') {
      apis.addEditViewSidePanel([SecurityPanel]);
    }
  },
  async registerTrads({ locales }: { locales: string[] }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, pluginId),
              locale,
            };
          })
          .catch(() => {
            return {
              data: {},
              locale,
            };
          });
      })
    );

    return Promise.resolve(importedTrads);
  },
};
