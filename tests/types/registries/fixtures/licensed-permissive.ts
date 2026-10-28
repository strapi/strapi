import type { Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

// A declared license scope without strict types: lookups and license feature reads keep develop's
// types.
declare global {
  namespace Strapi {
    namespace Registries {
      interface Settings {
        licenses: 'declared';
      }
      interface LicensedFeatures {
        'review-workflows': true;
      }
    }
  }
}

declare const checks: [
  Core.Assert<Equal<Core.IsStrict, false>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, Core.Service>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, Core.Service>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.users'>, Core.Service>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, Core.Controller>>,
  Core.Assert<Equal<Core.Strapi['services']['plugin::licensed-provider.reports'], Core.Service>>,
  Core.Assert<Equal<Parameters<Core.Strapi['ee']['features']['get']>, [feature: string]>>,
  Core.Assert<
    Equal<
      ReturnType<Core.Strapi['ee']['features']['get']>,
      string | { name: string; [key: string]: any } | undefined
    >
  >,
];
checks satisfies unknown;
