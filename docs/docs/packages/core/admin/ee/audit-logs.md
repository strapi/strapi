---
title: Audit Logs
description: Guide for Audit Logs
status: needs-review
review_notes:
  - '`ee/server/services/audit-logs.js` moved under `ee/server/src`.'
  - 'Events are also saved when a package registers them with `registerEvent` on the `audit-logs-lifecycle` service (upload and content-manager do), not only the `defaultEvents` list.'
  - '`registerEvent` takes an `action` option to store a row under another action name. Upload uses it to record media folders as `media.*` and `media.update` from an audit-only event, since `media.*` are also webhook events.'
---

# Audit Logs

## Summary

Audit Logs provide a way to view the history of all user actions at Admin API level. This includes actions related to entries (including publish actions), media (including its folders), users, login & logout of admin users, components, roles, and permissions, you can see the list of all the default events [here](https://github.com/strapi/strapi/blob/main/packages/core/admin/ee/server/services/audit-logs.js#L9).

## Backend design

The Audit Logs feature was built to take advantage of the eventHub. You can find the service and its core code at `packages/core/admin/ee/server/services`.

### Audit Logs Local Provider

To save audit log data, we utilize an Audit Logs local provider responsible for interacting with the database. This provider should return an object with a `register` function, and this function should return an object with functions to handle `saveEvent`, `findMany`, `findOne`, and `deleteExpiredEvents`.

### Content types

#### strapi_audit_logs

This content type stores all the audit logs. For each allowed event, we save an entry in the audit logs content type.

The `admin::audit-log` content type is registered by the CE admin (`packages/core/admin/server/src/content-types/index.ts`) in every edition, with or without a license, like the content types of content releases and review workflows. The CE bootstrap also adds `strapi_audit_logs` to the persisted tables. The schema file stays under `packages/core/admin/ee/server/src/audit-logs/content-types/`.

### Runtime gates

The routes, controller and services use one condition, `isAuditLogsEnabled` in `packages/core/admin/ee/server/src/audit-logs/utils.ts`: the license includes the `audit-logs` feature and `admin.auditLogs.enabled` is not `false`.

The `admin::audit-logs.read` / `admin::audit-logs.export` permission actions follow the license only (`packages/core/admin/ee/server/src/bootstrap.ts`), like the actions of review workflows, content releases and SSO. Turning `admin.auditLogs.enabled` off keeps the actions registered, so it keeps the audit-log grants of every role and admin token. While the config is off the routes are not mounted, and the role and admin token editors may still list the audit-log permissions. Turning the config back on makes the stored grants work again. `tests/api/core/admin/ee/audit-logs/config-disabled-permissions.test.api.ts` covers this behaviour.

When the license loses the `audit-logs` feature, the two actions are not registered on the next boot. The Super Admin reset (`resetSuperAdminPermissions`) drops them from the Super Admin, and the permission cleanup (`cleanPermissionsInDatabase`) deletes them from every other role and from admin tokens. When the feature comes back, the Super Admin reset restores them for the Super Admin only.

### Subscribing to all events

The Audit Logs feature adds a subscriber to the [EventHub](../../core/event-hub.md), allowing it to listen to all events in the application. However, we don't save every event in the audit logs; we only save the default ones (see the defaultEvents array in the service file).

### Retention days

As the number of events in our Audit Logs can grow significantly, we run a daily job at midnight to delete logs that are older than the retention days defined.

By default, the retention days are set to 90 days, but this value can be changed. For enterprise self-hosted projects, users can set a configuration variable (admin.auditLogs.retentionDays) and use that one.

For cloud projects, the retention days are determined by the license. In a cloud project, users can set a custom retention days in the configuration, but this value cannot exceed the retention days defined by the license.

In both cases, if we want to set a custom retention days we can modify the Admin Panel API config file (`./config/admin.js`). You can find all the possible options as well as other configurations for the Admin Panel on the [documentation page](https://docs.strapi.io/dev-docs/configurations/admin-panel#available-options).

### Export

Audit logs can be exported as a single CSV file from the list view. The export honours the active filters and requires both the `admin::audit-logs.read` and `admin::audit-logs.export` permissions. Every export also records an `audit-log.export` event.

By default, the export refuses to start when the matching set exceeds the maximum number of rows: 1,000,000. Self-hosted projects can change this limit with the `admin.auditLogs.exportMaxRows` configuration variable in the Admin Panel API config file (`./config/admin.js`).

### Permission editors when the config disables audit logs

When the license includes the `audit-logs` feature but `admin.auditLogs.enabled` is `false`, the EE `permission.getAll` controller (`packages/core/admin/ee/server/src/controllers/permission.ts`) adds `disabledByConfig: true` to the audit-log entries of the `settings` section of `GET /admin/permissions`. The role and admin-token permission editors keep the section visible and editable, and show a "Disabled by configuration" badge on it. The section is not hidden on purpose: a role or admin-token update replaces the full permission set, so hiding the section would delete its grants on the next save. The flag is only visible when the actions are registered while the config disables audit logs.

### Audit Logs format

Every Audit Log has the following format:

```typescript
type Event {
  action: string, // Name of the event
  date: Date, // When the event happens
  userId: number, // Id of the user that trigger the event
  payload?: Object, // Extra info of the event
};
```

To understand how we obtain this information, we need to know how we emit an event with the Event Hub. To emit an event, we use the following function: (To see more info about the EventHub, click [here](../../core/event-hub.md)

```typescript
strapi.eventHub.emit(name: Pick<Event, 'name'>, payload: Pick<Event, 'payload'>);
```

First, we check the event is coming from admin requests and it's on our [default events](https://github.com/strapi/strapi/blob/main/packages/core/admin/ee/server/services/audit-logs.js#L9) list, then when creating our Audit Log, we retrieve the action and payload from this emitted event, where the first argument is the action or event name, and the second one is the payload. We obtain the user from the requestContext.
