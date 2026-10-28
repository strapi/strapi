import type { Core } from '@strapi/strapi';
import type { EEUsersService, SeatsService } from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['licensed']`, for a license with no feature: the EE
// edition is merged, and the contracts of every feature are missing.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'on'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'off'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>['isSSOLocked'],
      EEUsersService['isSSOLocked']
    >
  >,
];
checks satisfies unknown;

void app.service('plugin::licensed-provider.seats').getDisabledUserList();
