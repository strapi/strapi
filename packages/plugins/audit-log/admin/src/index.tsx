import { prefixPluginTranslations } from '@strapi/strapi/admin';
import { PLUGIN_ID } from './pluginId';

export default {
  register(app: any) {
    app.addMenuLink({
      to: `plugins/${PLUGIN_ID}`,
      icon: () => '📋',
      intlLabel: {
        id: `${PLUGIN_ID}.plugin.name`,
        defaultMessage: 'Audit Logs',
      },
      Component: async () => {
        const { AuditLogsPage } = await import('./pages/AuditLogsPage');
        return AuditLogsPage;
      },
      permissions: [{ action: 'plugin::audit-log.read', subject: null }],
    });

    app.registerPlugin({
      id: PLUGIN_ID,
      name: 'Audit Log',
    });
  },

  async registerTrads(app: any) {
    const { locales } = app;

    const importedTranslations = await Promise.all(
      (locales as string[]).map((locale) => {
        return import(`./translations/${locale}.json`)
          .then(({ default: data }) => {
            return {
              data: prefixPluginTranslations(data, PLUGIN_ID),
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

    return importedTranslations;
  },
};

