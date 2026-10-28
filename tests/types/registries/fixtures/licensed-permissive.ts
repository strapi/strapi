import type { Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

// A declared license scope without strict types: lookups keep develop's types.
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
];
checks satisfies unknown;
