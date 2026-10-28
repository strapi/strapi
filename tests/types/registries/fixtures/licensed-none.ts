import type { Core } from '@strapi/strapi';
import type { CEUsersService } from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasMember<T, K extends string> = K extends keyof T ? true : false;

declare const app: Core.Strapi;

// Type generation without `typescript.licensedFeatures`: the application lists no gate, so gated
// contracts are missing and the EE edition is not merged.
declare const checks: [
  Core.Assert<Equal<Core.LicenseScope, 'declared'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'off'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'off'>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, undefined>>,
  Core.Assert<Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.users'>, CEUsersService>>,
];
checks satisfies unknown;

// @ts-expect-error The contract is `undefined`: "Property 'count' does not exist on type 'never'".
app.service('plugin::licensed-provider.reports')?.count();
// @ts-expect-error EE-only members are absent.
app.service('plugin::licensed-provider.users').isSSOLocked;

// The admin EE edition is not merged: EE-only services are missing, and CE services have their CE
// members only.
declare const adminChecks: [
  Core.Assert<Equal<Core.ServiceFor<'admin::persist-tables'>, undefined>>,
  Core.Assert<Equal<Core.ServiceFor<'admin::seat-enforcement'>, undefined>>,
  Core.Assert<Equal<HasMember<Core.ServiceFor<'admin::metrics'>, 'getSSOProvidersList'>, false>>,
  Core.Assert<
    Equal<HasMember<Core.ServiceFor<'admin::role'>, 'ssoCheckRolesIdForDeletion'>, false>
  >,
  Core.Assert<Equal<HasMember<Core.ServiceFor<'admin::user'>, 'getCurrentActiveUserCount'>, false>>,
];
adminChecks satisfies unknown;

// @ts-expect-error EE-only members are absent.
void app.service('admin::role').ssoCheckRolesIdForDeletion([]);
