import type { Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type HasUndefined<T> = undefined extends T ? true : false;

declare const app: Core.Strapi;

// Type generation with `licensedFeatures: ['audit-logs']`. Admin registers the audit logs controller
// only when `admin.auditLogs.enabled` is also on, which the license scope does not state: the
// controller may still be missing.
declare const checks: [
  Core.Assert<Equal<Core.LicenseState<'audit-logs'>, 'on'>>,
  Core.Assert<HasUndefined<Core.ControllerFor<'admin::audit-logs'>>>,
];
checks satisfies unknown;

// @ts-expect-error The controller is missing when `admin.auditLogs.enabled` is `false`.
void app.controller('admin::audit-logs').findMany;

const auditLogs = app.controller('admin::audit-logs');
if (auditLogs !== undefined) {
  void auditLogs.findMany.call;
}
