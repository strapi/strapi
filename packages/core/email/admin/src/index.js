// NOTE TO PLUGINS DEVELOPERS:
// If you modify this file by adding new options to the plugin entry point
// Here's the file: strapi/docs/3.x/plugin-development/frontend-field-api.md
// Here's the file: strapi/docs/3.x/guides/registering-a-field-in-admin.md
// Also the strapi-generate-plugins/files/admin/src/index.js needs to be updated
// IF THE DOC IS NOT UPDATED THE PULL REQUEST WILL NOT BE MERGED

import { prefixPluginTranslations } from '@strapi/helper-plugin';

import { PERMISSIONS } from './constants';

export default {
  register(app) {
    // Create the email settings section
    app.createSettingSection(
      {
        id: 'email',
        intlLabel: { id: 'email.SettingsNav.section-label', defaultMessage: 'Email Plugin' },
      },
      [
        {
          intlLabel: {
            id: 'email.Settings.email.plugin.title',
            defaultMessage: 'Settings',
          },
          id: 'settings',
          to: `/settings/email`,
          async Component() {
            const component = await import(
              /* webpackChunkName: "email-settings-page" */ './pages/Settings'
            );

            return component;
          },
          permissions: PERMISSIONS.settings,
        },
      ]
    );
    app.registerPlugin({
      id: 'email',
      name: 'email',
    });
  },
  bootstrap() {},
  async registerTrads({ locales }) {
    const importedTrads = await Promise.all(
      locales.map((locale) => {
        return import(
          /* webpackChunkName: "email-translation-[request]" */ `./translations/${locale}.json`
        )
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, 'email'),
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
