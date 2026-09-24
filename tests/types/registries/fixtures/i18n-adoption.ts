import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
import type { Core, Schema } from '@strapi/strapi';
import type { Services } from '@strapi/i18n/strapi-server';

// Application additions remain visible through both lookup paths.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppServices {
        'plugin::i18n.metrics': Services.MetricsService & { applicationMetric(): void };
      }
    }
  }
}

declare const app: Core.Strapi;
declare const schema: Schema.ContentType;
declare const context: Parameters<Core.ControllerHandler>[0];
declare const next: Parameters<Core.ControllerHandler>[1];
const plugin = app.plugin('i18n');

async function checkServiceContracts() {
  const code = await plugin.service('content-types').getValidLocale();
  code satisfies string | null;
  // @ts-expect-error A configured default locale can be missing.
  code satisfies string;
  // @ts-expect-error Locale codes are strings.
  plugin.service('content-types').getValidLocale(123);
  // @ts-expect-error Attribute traversal needs a schema with attributes.
  plugin.service('content-types').getLocalizedAttributes({});
  const fields = plugin
    .service('content-types')
    .copyNonLocalizedAttributes(schema, { title: 'Hi' });
  // @ts-expect-error Schema-dependent field values must be narrowed.
  fields.title.toUpperCase();

  const settings = await app.service('plugin::i18n.settings').getSettings();
  settings satisfies { aiLocalizations: boolean } | null;
  // @ts-expect-error Settings may not have been saved yet.
  settings.aiLocalizations satisfies boolean;
  // @ts-expect-error Settings accept boolean flags.
  plugin.service('settings').setSettings({ aiLocalizations: 'yes' });

  const job = await plugin.service('ai-localization-jobs').getJobByDocument('api::page.page', 'id');
  job satisfies Services.AILocalizationJob | null;
  // @ts-expect-error A document may not have a localization job.
  job.status satisfies 'processing' | 'completed' | 'failed';
  if (job !== null) {
    job.status satisfies 'processing' | 'completed' | 'failed';
    // @ts-expect-error Job records do not expose arbitrary fields as any.
    job.unknownField satisfies unknown;
  }
  // @ts-expect-error Required job lookup argument cannot be omitted.
  plugin.service('ai-localization-jobs').getJobByDocument('api::page.page');
  plugin.service('ai-localization-jobs').upsertJobForDocument({
    contentType: 'api::page.page',
    documentId: 'id',
    sourceLocale: 'en',
    targetLocales: ['fr'],
    // @ts-expect-error Only stored job statuses are accepted.
    status: 'unknown',
  });

  (await plugin.service('ai-localizations').isEnabled()) satisfies boolean;
  const aiLocalizations = plugin.service('ai-localizations');
  aiLocalizations.generateDocumentLocalizations({ model: 'api::page.page', document: null });
  // @ts-expect-error Generation requires a document, not an arbitrary scalar.
  aiLocalizations.generateDocumentLocalizations({ model: 'api::page.page', document: 1 });
  // @ts-expect-error Translation providers implement generateTranslations.
  plugin.service('ai-translations').registerProvider({ provider: { name: 'custom' } });

  const document = await plugin
    .service('fill-from-locale')
    .fetchRawDocument('api::page.page', 'en');
  // @ts-expect-error Fetching an absent document returns null.
  document.documentId satisfies string;
  // @ts-expect-error Relation transformation requires a permission checker.
  plugin.service('fill-from-locale').transformDocument({}, 'api::page.page', 'fr', {});
  // @ts-expect-error Document data is an object.
  plugin.service('localizations').syncNonLocalizedAttributes('id', schema);

  plugin
    .service('iso-locales')
    .getIsoLocales()
    .forEach((locale) => {
      locale.code satisfies string;
      // @ts-expect-error ISO catalog entries are not stored locales.
      locale.id satisfies unknown;
    });
  // @ts-expect-error Stored locales require a code.
  plugin.service('locales').create({ name: 'French' });
  const permissions = plugin.service('permissions');
  // @ts-expect-error Permission normalization requires an action.
  permissions.actions.normalizeRolePermissionsLocales([{ subject: 'api::page.page' }]);
  // @ts-expect-error Sanitization requires an entity, not a scalar.
  plugin.service('sanitize').sanitizeLocalizationFields(schema, 123);
  plugin.service('metrics').applicationMetric();
  app.service('plugin::i18n.metrics').applicationMetric();
  // @ts-expect-error Known metrics retain their callable signatures through an override.
  plugin.service('metrics').sendDidInitializeEvent('unexpected');
}
checkServiceContracts();

plugin.controller('locales').listLocales(context, next);
plugin.controller('iso-locales').listIsoLocales(context, next);
plugin.controller('settings').getSettings(context, next);
plugin.controller('content-types').getFillFromLocaleData(context, next);
plugin.controller('ai-localization-jobs').getJobForSingleType(context, next);
// @ts-expect-error Registry controller actions do not accept misspelled names.
plugin.controller('locales').listLocale(context, next);

type Controllers = {
  locales: Strapi.Registries.PackageControllers['plugin::i18n.locales'];
};
({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/locales',
      handler: 'locales.listLocales',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          {
            name: 'plugin::content-manager.hasPermissions',
            config: { actions: ['plugin::i18n.locale.read'] },
          },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::i18n'>;

({
  policies: [
    // @ts-expect-error i18n owns no relative hasPermissions policy.
    'hasPermissions',
    // @ts-expect-error Cross-plugin policy configuration is checked.
    { name: 'plugin::content-manager.hasPermissions', config: { actions: [123] } },
  ],
}) satisfies Core.RouteConfigFor<'plugin::i18n'>;
