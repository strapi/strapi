---
title: Entity Service
slug: /entity-service
tags:
  - Strapi Service
  - Entity Service
---

# Entity Service
The Entity Service is a wrapper around strapi.db.query
This wrapper uses the decorator pattern so plugins and strapi core packages can insert decorators to change the output of the entity service function
Examples are: plugins/i18n and the core/upload

## Checklist writing decorator
- You are always required to call service.(function).call() in your decorator function
- Always return the `opts`/`options` you get from the parent decorator to service into `service.(function).call()`. you are allowed to add your on stuff to it but the parent opts should always be respected.
- when using `service.(function).call()` ensure the first parameter is always `this` to not break the call chain
- Your function should always return the output of `service.(function).call()` how ever you are allowed to add stuff to it.
- when using any wrap functions do not call them in your decorator they are called by the Main Decorator only

## Checklist main decorator
- Ensure that the new function when it is not a wrap function calls all the wrappers and also the other way around

- your wrapper action is always your function name