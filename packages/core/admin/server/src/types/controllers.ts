import type { Core } from '@strapi/types';

/** Actions of the admin project controller (`routes/admin.ts`). */
export type AdminController = {
  /** `GET /admin/project-type` */
  getProjectType: Core.ControllerHandler;
  /** `GET /admin/init` */
  init: Core.ControllerHandler;
  /** `GET /admin/project-settings` */
  getProjectSettings: Core.ControllerHandler;
  /** `POST /admin/project-settings` */
  updateProjectSettings: Core.ControllerHandler;
  /** `GET /admin/telemetry-properties` */
  telemetryProperties: Core.ControllerHandler;
  /** `GET /admin/information` */
  information: Core.ControllerHandler;
  /** `GET /admin/debug-dump` */
  debugDump: Core.ControllerHandler;
  /** `GET /admin/plugins` */
  plugins: Core.ControllerHandler;
  /** `GET /admin/license-trial-time-left` */
  licenseTrialTimeLeft: Core.ControllerHandler;
  /** `GET /admin/guided-tour-meta` */
  getGuidedTourMeta: Core.ControllerHandler;
};

/** Actions of the admin authentication controller (`routes/authentication.ts`). */
export type AuthenticationController = {
  /** `POST /admin/login` */
  login: Core.ControllerHandler;
  /** `GET /admin/registration-info` */
  registrationInfo: Core.ControllerHandler;
  /** `POST /admin/register` */
  register: Core.ControllerHandler;
  /** `POST /admin/register-admin` */
  registerAdmin: Core.ControllerHandler;
  /** `POST /admin/forgot-password` */
  forgotPassword: Core.ControllerHandler;
  /** `POST /admin/reset-password` */
  resetPassword: Core.ControllerHandler;
  /** `POST /admin/access-token` */
  accessToken: Core.ControllerHandler;
  /** `POST /admin/logout` */
  logout: Core.ControllerHandler;
};

/** Actions of the admin permission controller (`routes/permissions.ts`). */
export type PermissionController = {
  /** `POST /admin/permissions/check` */
  check: Core.ControllerHandler;
  /** `GET /admin/permissions` */
  getAll: Core.ControllerHandler;
};

/** Actions of the current admin user's profile controller (`routes/users.ts`). */
export type AuthenticatedUserController = {
  /** `GET /admin/users/me` */
  getMe: Core.ControllerHandler;
  /** `PUT /admin/users/me` */
  updateMe: Core.ControllerHandler;
  /** `GET /admin/users/me/permissions` */
  getOwnPermissions: Core.ControllerHandler;
};

/** Actions of the current admin user's sessions controller (`routes/users.ts`). */
export type AuthenticatedSessionController = {
  /** `GET /admin/users/me/sessions` */
  list: Core.ControllerHandler;
  /** `DELETE /admin/users/me/sessions/:sessionId` */
  revoke: Core.ControllerHandler;
  /** `DELETE /admin/users/me/sessions` */
  revokeAll: Core.ControllerHandler;
};

/** Actions of the admin user controller (`routes/users.ts`). */
export type UserController = {
  /** `POST /admin/users` */
  create: Core.ControllerHandler;
  /** `GET /admin/users` */
  find: Core.ControllerHandler;
  /** `GET /admin/users/:id` */
  findOne: Core.ControllerHandler;
  /** `PUT /admin/users/:id` */
  update: Core.ControllerHandler;
  /** `DELETE /admin/users/:id` */
  deleteOne: Core.ControllerHandler;
  /** `POST /admin/users/batch-delete` */
  deleteMany: Core.ControllerHandler;
};

/** Actions of the admin role controller (`routes/roles.ts`). */
export type RoleController = {
  /** `POST /admin/roles` */
  create: Core.ControllerHandler;
  /** `GET /admin/roles/:id` */
  findOne: Core.ControllerHandler;
  /** `GET /admin/roles` */
  findAll: Core.ControllerHandler;
  /** `PUT /admin/roles/:id` */
  update: Core.ControllerHandler;
  /** `GET /admin/roles/:id/permissions` */
  getPermissions: Core.ControllerHandler;
  /** `PUT /admin/roles/:id/permissions` */
  updatePermissions: Core.ControllerHandler;
  /** `DELETE /admin/roles/:id` */
  deleteOne: Core.ControllerHandler;
  /** `POST /admin/roles/batch-delete` */
  deleteMany: Core.ControllerHandler;
};

/** Actions of the webhook controller (`routes/webhooks.ts`). */
export type WebhooksController = {
  /** `GET /admin/webhooks` */
  listWebhooks: Core.ControllerHandler;
  /** `GET /admin/webhooks/:id` */
  getWebhook: Core.ControllerHandler;
  /** `POST /admin/webhooks` */
  createWebhook: Core.ControllerHandler;
  /** `PUT /admin/webhooks/:id` */
  updateWebhook: Core.ControllerHandler;
  /** `DELETE /admin/webhooks/:id` */
  deleteWebhook: Core.ControllerHandler;
  /** `POST /admin/webhooks/batch-delete` */
  deleteWebhooks: Core.ControllerHandler;
  /** `POST /admin/webhooks/:id/trigger` */
  triggerWebhook: Core.ControllerHandler;
};

/** Actions of the Content API token controller (`routes/api-tokens.ts`). */
export type ApiTokenController = {
  /** `POST /admin/api-tokens` */
  create: Core.ControllerHandler;
  /** `POST /admin/api-tokens/:id/regenerate` */
  regenerate: Core.ControllerHandler;
  /** `GET /admin/api-tokens` */
  list: Core.ControllerHandler;
  /** `DELETE /admin/api-tokens/:id` */
  revoke: Core.ControllerHandler;
  /** `GET /admin/api-tokens/:id` */
  get: Core.ControllerHandler;
  /** `PUT /admin/api-tokens/:id` */
  update: Core.ControllerHandler;
};

/** Actions of the admin token controller (`routes/admin-tokens.ts`). */
export type AdminTokenController = {
  /** `POST /admin/admin-tokens` */
  create: Core.ControllerHandler;
  /** `POST /admin/admin-tokens/:id/regenerate` */
  regenerate: Core.ControllerHandler;
  /** `GET /admin/admin-tokens` */
  list: Core.ControllerHandler;
  /** `DELETE /admin/admin-tokens/:id` */
  revoke: Core.ControllerHandler;
  /** `GET /admin/admin-tokens/:id` */
  get: Core.ControllerHandler;
  /** `PUT /admin/admin-tokens/:id` */
  update: Core.ControllerHandler;
  /** `GET /admin/admin-tokens/:id/owner-permissions` */
  getOwnerPermissions: Core.ControllerHandler;
};

/** Actions listing the Content API permissions and routes (`routes/content-api.ts`). */
export type ContentApiController = {
  /** `GET /admin/content-api/permissions` */
  getPermissions: Core.ControllerHandler;
  /** `GET /admin/content-api/routes` */
  getRoutes: Core.ControllerHandler;
};

/**
 * Actions of the data transfer controller (`routes/transfer.ts`). `controllers/transfer/index.ts`
 * builds them from the runner and token controllers, prefixing each action name.
 */
export type TransferController = {
  /** `GET /admin/transfer/runner/push` */
  'runner-push': Core.ControllerHandler;
  /** `GET /admin/transfer/runner/pull` */
  'runner-pull': Core.ControllerHandler;
  /** `GET /admin/transfer/tokens` */
  'token-list': Core.ControllerHandler;
  /** `GET /admin/transfer/tokens/:id` */
  'token-getById': Core.ControllerHandler;
  /** `POST /admin/transfer/tokens` */
  'token-create': Core.ControllerHandler;
  /** `PUT /admin/transfer/tokens/:id` */
  'token-update': Core.ControllerHandler;
  /** `DELETE /admin/transfer/tokens/:id` */
  'token-revoke': Core.ControllerHandler;
  /** `POST /admin/transfer/tokens/:id/regenerate` */
  'token-regenerate': Core.ControllerHandler;
};

/** Actions of the homepage controller (`routes/homepage.ts`). */
export type HomepageController = {
  /** `GET /admin/homepage/key-statistics` */
  getKeyStatistics: Core.ControllerHandler;
  /** `GET /admin/homepage/layout` */
  getHomepageLayout: Core.ControllerHandler;
  /** `PUT /admin/homepage/layout` */
  updateHomepageLayout: Core.ControllerHandler;
};

/** Actions of the Strapi AI controller (`ai/routes/ai.ts`). */
export type AiController = {
  /** `GET /admin/ai-token` */
  getAiToken: Core.ControllerHandler;
  /** `GET /admin/ai-usage` */
  getAiUsage: Core.ControllerHandler;
  /** `GET /admin/ai-feature-config` */
  getAiFeatureConfig: Core.ControllerHandler;
};

/** The CE controller contracts by name, as in the admin controllers map. */
export type Controllers = {
  admin: AdminController;
  'admin-token': AdminTokenController;
  ai: AiController;
  'api-token': ApiTokenController;
  'authenticated-session': AuthenticatedSessionController;
  'authenticated-user': AuthenticatedUserController;
  authentication: AuthenticationController;
  'content-api': ContentApiController;
  homepage: HomepageController;
  permission: PermissionController;
  role: RoleController;
  transfer: TransferController;
  user: UserController;
  webhooks: WebhooksController;
};

/**
 * The actions of `TController` named `<prefix>-<action>`, keyed by `<action>`: the controller that
 * `controllers/transfer/index.ts` prefixes with `TPrefix`.
 */
export type PrefixedActions<TController, TPrefix extends string> = {
  [
    TName in keyof TController as TName extends `${TPrefix}-${infer TAction}` ? TAction : never
  ]: TController[TName];
};
