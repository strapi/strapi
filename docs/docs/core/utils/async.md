---
title: Async utils functions
tags:
  - utils
---

# Async utils

## Summary

Async utils are grouping all function that interact with async stuff like Promises.

## Detailed design

Available functions:

- pipeAsync
- mapAsync
- reduceAsync

[See API reference](../../api/Utils) (TODO)

### When to use

Everytime the code has to act with promises and iterate other them, an async utils function should be used.

### Should I add my function here ?

Any util function that manipulates promises can be included in this utils section.

Please consider the next point if a lots of functions are available in the async section.

## Potential improvements

If we begin to use lots of async utils function, we may consider to migrate to a specialized library like [asyncjs](http://caolan.github.io/async/v3/)

## Resources

- [Async file in Strapi](https://github.com/strapi/strapi/blob/9b36c3b10adaa00fd3596853abc63122632c36fe/packages/core/utils/lib/async.js)
- http://caolan.github.io/async/v3/
