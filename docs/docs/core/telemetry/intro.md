---
title: Introduction
slug: /telemetry
tags:
  - telemetry
---

# Telemetry

This section is an overview of how telemetry is structure and sent in Strapi.

# Sending Events in Strapi

In Strapi, you can track user activity and application usage by sending events using the `strapi.telemetry.send` function. The `send` function takes two parameters: the event name and a payload object.

## Event Name

The event name should be a clear and descriptive name that conveys the purpose of the event. Examples of standard event names in Strapi include didSelectFile and willCreateEntry. **Any new event that is to be added must be reported to the product manager and documented.**

## Payload Object

The payload object contains information about the event and the user who triggered it. It can include three attributes: `eventProperties`, `userProperties`, and `groupProperties`.

**Please note that any new attribute that is to be added to eventProperties, userProperties, or groupProperties, needs to be added in the [tracker Strapi repository](https://github.com/strapi/tracker/blob/main/src/schemas/track-v2.ts).**

### Event Properties

The `eventProperties` attribute is an object that contains additional information about the event. Examples of event properties in Strapi include `model`, `containsRelationalFields`, `displayedFields`, `kind`, and `hasDraftAndPublish`. These properties are specific to the event and are used to provide additional context about what happened.

### User Properties

The `userProperties` attribute is an object that defines the identity of the user who triggered the event. This can include information such as the user's operating system, node version, and hostname. These properties are typically used to group events by user or to filter events based on certain user characteristics.

### Group Properties

The `groupProperties` attribute is an object that defines properties of the application or environment in which the event occurred. This can include information such as the language(s) used in the application, the database being used, and the number of locales. These properties are typically used to group events by application version, environment, or other characteristics.

## Backend - Sending telemetry

You can send telemetry events by using the `strapi.telemetry.send` function. The `send` function takes two parameters: the event name and a payload object (See upper section for more details).

### Example

The recommended structure for sending an event is:
Examples of recommended structures for sending an event are:

```js
strapi.telemetry.send('eventName', {
  eventProperties: {
    attribute1: 'value1',
    attribute2: 'value2',
  },
});
```

```js
strapi.telemetry.send('eventName', {
  eventProperties: {
    attribute1: 'value1',
    attribute2: 'value2',
  },
  userProperties: {
    attribute1: 'value1',
    attribute2: 'value2',
  },
});
```

```js
strapi.telemetry.send('eventName', {
  groupProperties: {
    attribute1: 'value1',
    attribute2: 'value2',
  },
});
```
