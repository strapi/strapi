---
title: Event Hub
description: The event hub is a central system that processes a variety of events in a Strapi application
tags:
  - core
  - plugins
---

# Event Hub

## Summary

The event hub is a central system that processes a variety of events in a Strapi application. These events can be emitted from a variety of sources to trigger associated subscriber functions.

<img
  src="/img/utils/event-hub-diagram.png"
  alt="A diagram showing how the event hub processes events with multiple sources with multiple subscribers"
/>

_above: A diagram showing how the event hub processes events from different sources with multiple subscribers_

Events are mainly used in Strapi to power the webhooks and audit logs features. However, plugin developers can also access the event-hub using the plugin API. This means plugins can listen to events emitted by Strapi and emit new events to the event hub.

## Detailed design

The event hub is a store of subscriber functions. When an event is emitted to the hub, each subscriber function in the store will be called with the event's name and a variable number of arguments.

This design was inspired by the way Strapi handles [lifecycle hooks](https://docs.strapi.io/developer-docs/latest/development/backend-customization/models.html#lifecycle-hooks). It was chosen over the [Node.js event emitter](https://nodejs.org/api/events.html#class-eventemitter) because it provides the ability to have a single subscriber function per feature, and does not cause [memory leak concerns](https://stackoverflow.com/questions/9768444/possible-eventemitter-memory-leak-detected).

### Emitting events

#### `emit`

Dispatches a new event into the hub. It returns a promise that resolves when all the subscribers have run.

```ts
// Types
type Emit = (name: string, ...args: any[]) => Promise<void>;

// Usage
strapi.eventHub.emit('some.event', { meta: 'data' });
```

### Managing subscribers

#### `subscribe`

Adds a subscriber function that will be called for each event emitted to the hub. It returns a function that can be called to remove the subscriber.

```ts
// Types
type Subscriber = (name: string, ...args: Object) => void | Promise<void>;
type UnsubscribeCallback = () => void;
type Subscribe = (subscriber: Subscriber) => UnsubscribeCallback;

// Add a subscriber
const unsubcribe = strapi.eventHub.subscribe((name: string, ...args: any[]) => {
  // Write your subscriber logic here
});

// Remove the subscriber using the returned function
unsubscribe();
```

#### `unsubscribe`

Removes a subscriber function. You need to give it the reference of the subscriber as an argument.

```ts
// Types
type Subscriber = (name: string, ...args: any[]) => void | Promise<void>;
type Unsubscribe = (subscriber: Subscriber) => void;

// After a subscriber has been added
const subscriber: Subscriber = (name, ...args) => {};
strapi.eventHub.subscribe(subscriber);

// Use its reference to remove it
strapi.eventHub.unsubcribe(subscriber);
```

### Listening to a single event

If you only need to run a function for one specific event, then creating a subscriber function may be overkill. For this reason, the event hub provides the `on`,`off` and `once` methods, inspired by the [Node.js event emitter](https://nodejs.org/api/events.html#class-eventemitter).

#### `on`

Registers a listener function that is called every time a _specific_ event is emitted. It returns a function that can be called to remove the listener.

```ts
// Types
type Listener = (args: any[]) => void | Promise<void>;
type RemoveListenerCallback = () => void;
type On = (eventName: string, listener: Listener) => RemoveListenerCallback;

// Add a listener
const removeListener = strapi.eventHub.on('some.event', () => {
  // Write your listener logic here
});

// Remove the listener using the returned function
removeListener();
```

#### `off`

Removes a listener function. You need to give it the name of the event it's listening to, as well as the reference of the listener as an argument.

```ts
// Types
type Listener = (args: any[]) => void | Promise<void>;
type Off = (listener: Listener) => void;

// After a listener has been added
const listener: Listener = (...args) => {};
strapi.eventHub.on('some.event', listener);

// Use its reference to remove it
strapi.eventHub.off('some.event', listener);
```

#### `once`

Registers a listener function that will only be called the first time an event is emitted. Once the event has been emitted, the listener will be removed automatically. It also returns a function that can be used to remove the listener before it was called.

```ts
// Types
type Listener = (args: any[]) => void | Promise<void>;
type RemoveListenerCallback = () => void;
type Once = (eventName: string, listener: Listener) => RemoveListenerCallback;

// Add a single-use listener
const removeListener = strapi.eventHub.once('some.event', () => {
  // Write your listener logic here
});

// Remove the single-use listener using the returned function
removeListener();
```

## Tradeoffs

- Potential breaking changes: a change to an event's name or payload may affect other features or plugins listening to the same event. Backwards compatibility is a concern when managing these events.
- Performance: Strapi emits a lot of events, so you need to make sure your subscriber functions aren't too expensive to run.

## Alternatives

You may not need the event hub:

- If you want to listen to database events on a specific content type, use [lifecycle hooks](https://docs.strapi.io/developer-docs/latest/development/backend-customization/models.html#lifecycle-hooks)
- If you want to listen to database events on all content types, use a [generic database lifecycle hook](https://docs.strapi.io/developer-docs/latest/development/backend-customization/models.html#declarative-and-programmatic-usage)
- If you want to emit an event, but don't want it to be exposed to other features or plugins, create a [service](https://docs.strapi.io/developer-docs/latest/development/backend-customization/services.html#services) and call it directly instead
