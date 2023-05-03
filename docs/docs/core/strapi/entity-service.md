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
The Entity Service uses the decorator pattern so plugins and Strapi core packages can insert decorators to change the output of the Entity Service function.

Examples of decorators are plugins/i18n and the core/upload.  You can decorate it like:


SOME CODE  EXAMPLE


### decorators
When writing a decorator, please make sure you follow this checklist:
- You should call `service.(function).call()` in your decorator function. the consequence of not doing this is that you are not calling the decorators bellow this decorator. What would mean you ignore them.
- You are recommend to add your changes to the output of `service.(function).call()` so you can return it with the output of the lower laying decorators.
- It is best to use `opts`/`options` you get from the parent decorator into your service call into `service.(function).call()`. You can add stuff to it but please remember to not change the options you get. Since change them would have as an effect that it could break the decorator above it.
- when using `service.(function).call()` It is highly recommended for the first argument to be `this`. Not doing this will has a a result that the wrappers above won't be called since the call chain is broken
- Wrappers are called on the lowest layer by the main decorator so no need to call them in your functions

#### Main decorator
When updating the main decorator, please make sure you follow this checklist:
- When adding a new function please don't forget to add all wrapper functions to it. Not doing this could have as consequence that the wrapping of the input our output does not happen by decorators. 
- The convention is to use the function name as the wrapper action examples
  - findMany() wrapper action name `{ uid, action: 'findMany' }`
  - findWithRelationCounts() wrapper action name `{ uid, action: 'findWithRelationCounts' }`