import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
import type { Core } from '@strapi/strapi';
import type {} from '@strapi/i18n/strapi-server';
// Check the emitted private helper declaration; this is not a public package entry point.
// eslint-disable-next-line node/no-unpublished-import
import type { getService } from '../../../../packages/plugins/i18n/dist/server/src/utils/index.js';

declare const getI18nService: typeof getService;

declare const app: Core.Strapi;

// Loading all i18n contracts does not opt applications into strictness.
getI18nService('metrics').sendDidInitializeEvent('unexpected').anything();
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
