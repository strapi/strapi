---
title: Async utils functions
tags:
  - utils
---

# Async utils

## Summary

Async utils are grouping all function that interact with async stuff like Promises.

## Detailed design

### map

The `map` function is an asynchronous version of the `Array.prototype.map` method.

Example usage:

```js
import { async } from '@strapi/utils';

const input = [1, 2, 3];

const output = await async.map(input, async (item) => {
  return item * 2;
});

console.log(output); // [2, 4, 6]
```

### reduce

The `reduce` function is an asynchronous version of the `Array.prototype.reduce` method.

Example usage:

```js
import { async } from '@strapi/utils';
const input = [1, 2, 3];

const reducer = async.reduce(input);
const output = await reducer(async (accumulator, item) => {
  return accumulator + item;
}, 0);

console.log(output); // 6
```

### pipe

The `pipe` function is a utility function for composing asynchronous functions. It takes a list of functions as input, and returns a new function that applies each function in turn to the input.

Example usage:

```js
import { async } from '@strapi/utils';

async function addOne(input: number): Promise<number> {
  return input + 1;
}

async function double(input: number): Promise<number> {
  return input * 2;
}

const addOneAndDouble = async.pipe(addOne, double);

const output = await addOneAndDouble(3);

console.log(output); // 8
```

### When to use

Every time the code has to act with promises and iterate other them, an async utils function should be used.

### Should I add my function here ?

Any util function that manipulates promises can be included in this utils section.

Please consider the next point if a lots of functions are available in the async section.

## Potential improvements

Some ideas of functions that could be added:

- Other `Array.prototype` methods: `filterAsync`, `someAsync`, `everyAsync`, `findAsync`, `findIndexAsync`, `flatMapAsync`.
- `retryAsync`: A function that retries an asynchronous operation a specified number of times if it fails. It takes an asynchronous operation and a number of retries as input, and returns the result of the operation if it succeeds within the specified number of retries, or throws an error if it fails after all retries.
- `timeoutAsync`: A function that adds a timeout to an asynchronous operation. It takes an asynchronous operation and a timeout duration as input, and returns the result of the operation if it completes within the specified timeout, or throws an error if it takes longer than the timeout.

If we begin to use lots of async utils function, we may consider to migrate to a specialized library like [asyncjs](http://caolan.github.io/async/v3/)

## Resources

- [Async file in Strapi](https://github.com/strapi/strapi/blob/9b36c3b10adaa00fd3596853abc63122632c36fe/packages/core/utils/lib/async.js)
- http://caolan.github.io/async/v3/
