import type { Core } from '@strapi/strapi';
import type {
  CEUsersService,
  EEUsersService,
  ReleasesService,
  ReportsController,
  ReportsService,
  SeatsService,
} from './licensed-provider';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const app: Core.Strapi;

// No license scope: a plugin program, or an application that opts in to strict types without type
// generation. Gated contracts may be missing, and EE-only members are optional.
declare const checks: [
  Core.Assert<Equal<Core.IsStrict, true>>,
  Core.Assert<Equal<Core.LicenseScope, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'review-workflows'>, 'unknown'>>,
  Core.Assert<Equal<Core.LicenseState<'licensed'>, 'unknown'>>,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::licensed-provider.reports'>, ReportsService | undefined>
  >,
  Core.Assert<
    Equal<Core.ServiceFor<'plugin::licensed-provider.releases'>, ReleasesService | undefined>
  >,
  Core.Assert<Equal<Core.ServiceFor<'plugin::licensed-provider.seats'>, SeatsService | undefined>>,
  Core.Assert<
    Equal<Core.ControllerFor<'plugin::licensed-provider.reports'>, ReportsController | undefined>
  >,
  Core.Assert<
    Equal<
      Core.ServiceFor<'plugin::licensed-provider.users'>,
      CEUsersService & Partial<Omit<EEUsersService, keyof CEUsersService>>
    >
  >,
];
checks satisfies unknown;

app.plugin('licensed-provider').service('reports')?.count() satisfies number | undefined;
// @ts-expect-error The service may be missing.
app.service('plugin::licensed-provider.reports').count();
app.service('plugin::licensed-provider.users').isSSOLocked?.() satisfies boolean | undefined;
