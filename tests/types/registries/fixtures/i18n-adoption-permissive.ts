import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
import type { Core } from '@strapi/strapi';
import type {} from '@strapi/i18n/strapi-server';

declare const app: Core.Strapi;

// Loading all i18n contracts does not opt applications into strictness.
app.plugin('i18n').service('content-types').getValidLocale(123).anything();
app.plugin('i18n').service('settings').setSettings({ aiLocalizations: 'yes' });
app.service('plugin::i18n.ai-localization-jobs').getJobByDocument();
app
  .plugin('i18n')
  .controller('locales')
  .unknownAction?.({} as never, async () => {});
({
  policies: [
    'hasPermissions',
    { name: 'plugin::content-manager.hasPermissions', config: { actions: 123 } },
  ],
}) satisfies Core.RouteConfigFor<'plugin::i18n'>;
