import type { Core } from '@strapi/strapi';
import type {
  CEUsersService,
  EEUsersService,
  ReportsController,
  ReportsService,
  SeatsService,
} from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasUndefined<T> = undefined extends T ? true : false;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['review-workflows']`: the contracts of the listed feature
// exist, those of other features are missing. A listed feature implies `'licensed'`, so the EE
// edition is merged.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'on'>>,
  Core.Assert<Equal<Core.LicenseState<'cms-content-releases'>, 'off'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'on'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, ReportsService>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, ReportsController>>,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>,
      Omit<CEUsersService, keyof EEUsersService> & EEUsersService
    >
  >,
];
checks satisfies unknown;

app.plugin('licensed-provider').service('reports').count() satisfies number;
void app
  .service('plugin::licensed-provider.users')
  .create()
  .then((user) => user.isSSOLocked satisfies boolean);
// @ts-expect-error The feature is not listed: the contract is `undefined`.
void app.service('plugin::licensed-provider.releases').publish(1);

// The listed feature implies the admin EE edition, so EE-only services exist, and CE services have the members it adds.
declare const adminChecks: [
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::persist-tables'>>, false>>,
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::seat-enforcement'>>, false>>,
  Core.Assert<Equal<HasUndefined<Core.ServiceFor<'admin::metrics'>['getSSOProvidersList']>, false>>,
  Core.Assert<
    Equal<HasUndefined<Core.ServiceFor<'admin::role'>['ssoCheckRolesIdForDeletion']>, false>
  >,
  Core.Assert<
    Equal<HasUndefined<Core.ServiceFor<'admin::user'>['getCurrentActiveUserCount']>, false>
  >,
];
adminChecks satisfies unknown;

void app.service('admin::seat-enforcement').getDisabledUserList();
void app.service('admin::role').ssoCheckRolesIdForDeletion([]);
