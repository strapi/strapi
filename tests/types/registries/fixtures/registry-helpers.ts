import type {} from '@strapi/admin/strapi-server';
import type {} from '@strapi/content-manager/strapi-server';
import type { Core } from '@strapi/strapi';
import type { Services } from '@strapi/i18n/strapi-server';

// Application contract checked against its factory, the C3 pattern of discussion #27747.
type InviteService = { countPending(): Promise<number> };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface AppServices {
        'api::invite.invite': InviteService;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const checks: [
  Core.Assert<Equal<Core.IsStrict, true>>,
  Core.Assert<
    Equal<
      Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::i18n'>['locales'],
      Services.LocaleService
    >
  >,
  Core.Assert<
    Core.SameNames<
      keyof Core.RegisteredFor<Strapi.Registries.PackageControllers, 'plugin::i18n'>,
      'locales' | 'iso-locales' | 'content-types' | 'settings' | 'ai-localization-jobs'
    >
  >,
];
checks satisfies unknown;

(({ strapi }) => ({
  async countPending() {
    return strapi.config.get('plugin::invite.pending', 0);
  },
})) satisfies Core.ServiceFactory<'api::invite.invite'>;

(() => ({
  // @ts-expect-error The factory must return the registered contract.
  countPending: async () => 'none',
})) satisfies Core.ServiceFactory<'api::invite.invite'>;

// A package contract, application overrides first.
(() => ({
  getIsoLocales: () => [{ code: 'en', name: 'English' }],
})) satisfies Core.ServiceFactory<'plugin::i18n.iso-locales'>;
(() => ({
  // @ts-expect-error Locale catalog entries need a name.
  getIsoLocales: () => [{ code: 'en' }],
})) satisfies Core.ServiceFactory<'plugin::i18n.iso-locales'>;
// @ts-expect-error A typo in the UID is not a registered service.
(() => ({})) satisfies Core.ServiceFactory<'api::invites.invite'>;
