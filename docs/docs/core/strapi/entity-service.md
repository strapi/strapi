---
title: Entity Service
tags:
  - strapi
  - service
  - entity-service
---

# Entity Service
Strapi provides an Entity Service API, built on top of the Query Engine API (entity-manager in the Database Layer). The Entity Service is the layer that handles Strapi's complex data structures like components and dynamic zones, and uses the Query Engine API under the hood to execute database queries.
## Decorators
The Entity Service exposes a `decorate` method which allows other Strapi packages to modify or extend the Entity Service API by adding new functions called _decorators_

Examples of decorators are plugins/i18n and the core/upload.  You can decorate it like:


SOME CODE  EXAMPLE


### using strapi.entityService.decorate()
When writing a decorator, please make sure you follow this checklist:
- You should call `service.methodName.call()` in your decorator function. Otherwise the the decorators that have not yet be called in the chain will never be called.
- Adding your changes to the output of `service.(function).call()` is recommended. That way it is returned with the output of the lower level decorators.
- It is best to use the `opts`/`options` arguments received from the parent decorator in the `service.(function).call()` function. You can add to the `opts`/`options` arguments please remember to change anything already in it. Changing anything already in the `opts`/`options` could undo the work of the decorators already been done.
- Providing `this` as the first argument to `service.(function).call()` is highly recommended. If this argument is omitted the call chain will break and the wrappers above will not be called.
- Wrappers are called on the lowest layer by the main decorator so no need to call them in your functions

#### Main decorator
When updating the main decorator, please make sure you follow this checklist:
- When adding a new function please don't forget to add all wrapper functions to it.
- The convention is to use the function name as the wrapper action. For example:
  - `findMany()` wrapper action name `{ uid, action: 'findMany' }`
  - `findWithRelationCounts()` wrapper action name `{ uid, action: 'findWithRelationCounts' }`
