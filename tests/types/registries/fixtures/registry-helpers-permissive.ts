import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
import type { Core } from '@strapi/strapi';
import type {} from '@strapi/i18n/strapi-server';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

// Without strict types, factories may return any service, as on develop, and any UID is accepted.
declare const checks: [
  Core.Assert<Equal<Core.IsStrict, false>>,
  Core.Assert<Equal<ReturnType<Core.ServiceFactory<'plugin::i18n.iso-locales'>>, Core.Service>>,
];
checks satisfies unknown;

(() => ({
  getIsoLocales: () => 'anything',
})) satisfies Core.ServiceFactory<'plugin::i18n.iso-locales'>;
(() => ({})) satisfies Core.ServiceFactory<'api::invites.invite'>;

// The drift helpers read the registries, which packages fill with or without strict types.
({
  locales: {},
  'iso-locales': {},
  'content-types': {},
  settings: {},
  'ai-localization-jobs': {},
}) satisfies Record<
  keyof Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::i18n'>,
  unknown
>;
