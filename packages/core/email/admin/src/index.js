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
          Component: () => import(/* webpackChunkName: "email-settings-page" */ './pages/Settings'),
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
