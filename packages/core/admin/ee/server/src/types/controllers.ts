import type { Core } from '@strapi/types';

/** EE actions of the admin project controller, merged over the CE `admin` controller. */
export type AdminController = {
  /** `GET /admin/project-type`: replaces the CE action, with the license data. */
  getProjectType: Core.ControllerHandler;
  /** `GET /admin/license-limit-information` (`routes/license-limit.ts`) */
  licenseLimitInformation: Core.ControllerHandler;
};

/** EE SSO actions, merged over the CE `authentication` controller (`routes/sso.ts`). */
export type AuthenticationController = {
  /** `GET /admin/providers` */
  getProviders: Core.ControllerHandler;
  /** `GET /admin/providers/options` */
  getProviderLoginOptions: Core.ControllerHandler;
  /** `PUT /admin/providers/options` */
  updateProviderLoginOptions: Core.ControllerHandler;
  /** `GET` and `POST /admin/connect/:provider` */
  providerLogin: Core.ControllerHandler;
};

/** EE actions of the admin role controller, merged over the CE `role` controller. */
export type RoleController = {
  /** `POST /admin/roles`: replaces the CE action. */
  create: Core.ControllerHandler;
  /** `DELETE /admin/roles/:id`: replaces the CE action. */
  deleteOne: Core.ControllerHandler;
  /** `POST /admin/roles/batch-delete`: replaces the CE action. */
  deleteMany: Core.ControllerHandler;
};

/** EE actions of the admin user controller, merged over the CE `user` controller. */
export type UserController = {
  /** `POST /admin/users`: replaces the CE action, with the seat limit check. */
  create: Core.ControllerHandler;
  /** `PUT /admin/users/:id`: replaces the CE action, with the seat limit check. */
  update: Core.ControllerHandler;
  /** `GET /admin/providers/isSSOLocked` (`routes/sso.ts`) */
  isSSOLocked: Core.ControllerHandler;
};

/** Actions of the audit logs controller (`audit-logs/routes/audit-logs.ts`). */
export type AuditLogsController = {
  /** `GET /admin/audit-logs` */
  findMany: Core.ControllerHandler;
  /** `GET /admin/audit-logs/users` */
  findManyUsers: Core.ControllerHandler;
  /** `GET /admin/audit-logs/:id` */
  findOne: Core.ControllerHandler;
  /** `GET /admin/audit-logs/export` */
  export: Core.ControllerHandler;
};

/**
 * The EE controller contracts by name, as `getAdminEE()` merges them over the CE controllers map.
 * `audit-logs` is added only when the `audit-logs` feature is enabled and `admin.auditLogs.enabled`
 * is not `false`.
 */
export type Controllers = {
  admin: AdminController;
  'audit-logs': AuditLogsController;
  authentication: AuthenticationController;
  role: RoleController;
  user: UserController;
};
