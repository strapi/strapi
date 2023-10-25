---
title: Audit Logs
description: Guide for Audit Logs
tags:
  - settings
  - audit-logs
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

### Subscribing to all events

The Audit Logs feature adds a subscriber to the [EventHub](/docs/core/strapi/event-hub), allowing it to listen to all events in the application. However, we don't save every event in the audit logs; we only save the default ones (see the defaultEvents array in the service file).

### Retention days

As the number of events in our Audit Logs can grow significantly, we run a daily job at midnight to delete logs that are older than the retention days defined.

By default, the retention days are set to 90 days, but this value can be changed. For enterprise self-hosted projects, users can set a configuration variable (admin.auditLogs.retentionDays) and use that one.

For cloud projects, the retention days are determined by the license. In a cloud project, users can set a custom retention days in the configuration, but this value cannot exceed the retention days defined by the license.

In both cases, if we want to set a custom retention days we can modify the Admin Panel API config file (`./config/admin.js`). You can find all the possible options as well as other configurations for the Admin Panel on the [documentation page](https://docs.strapi.io/dev-docs/configurations/admin-panel#available-options).

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

To understand how we obtain this information, we need to know how we emit an event with the Event Hub. To emit an event, we use the following function: (To see more info about the EventHub, click [here](/docs/core/strapi/event-hub)

```typescript
strapi.eventHub.emit(name: Pick<Event, 'name'>, payload: Pick<Event, 'payload'>);
```

First, we check the event is coming from admin requests and it's on our [default events](https://github.com/strapi/strapi/blob/main/packages/core/admin/ee/server/services/audit-logs.js#L9) list, then when creating our Audit Log, we retrieve the action and payload from this emitted event, where the first argument is the action or event name, and the second one is the payload. We obtain the user from the requestContext.
