---
title: API Reference example
tags:
  - utils
  - class
  - public
  - global

toc_min_heading_level: 2
toc_max_heading_level: 3
---

import Type from '@site/docs/api/components/type';

# Name of Module

:::info

Current state: **Stable** | **Legacy** | **Deprecated**

:::

_**Stable** - can be use as is_

_**Legacy** - Old code that needs refactoring to match the current architecture of the code_

_**Deprecated** - Should **NOT** be used, this will be deleted anytime soon_

_Description with a general example on how to use this Class / Module_

## Class: Name of the class

### Public variable (e.g. in an EventEmitter class `Event: 'close'`)

### Static methods (e.g. `Static method: Class.default()`)

### `new Class()`

Instances of the Class class can be created using the new keyword.

```javascript
const myClass = new Class();
```

### `class.method(param1, param2)`

- `param1`: <Type>String</Type> (can be linked to other API doc page).
- `param2`: <Type>Object</Type>
  - `options1`: <Type>Number</Type>

The `class.method()` method display the `param1` and then skip `param2` lines.

#### Examples

```javascript
const { Class } = require('pathToClassFile');
const textLines = ['Welcome', "That's all", 'Thanks'];

const classInstance = new Class();

for (const text of textLines) {
  classInstance.method(text, 1);
}
// Prints:
//   Welcome
//   That's all
//   Thanks
```

## Function: `name_of_the_function(param1, param2)`

- `param1`: <Type>String</Type> (can be linked to other API doc page)
- `param2`: <Type>Object</Type>
  - `options1`: <Type>Number</Type>

The `name_of_the_function()` method display the `param1` and then skip `param2` lines.

#### Examples

```javascript
const { name_of_the_function } = require('pathToFunctionFile');
const textLines = ['Welcome', "That's all", 'Thanks'];

for (const text of textLines) {
  name_of_the_function(text, 1);
}
// Prints:
//   Welcome
//   That's all
//   Thanks
```

This structure is highly based on NodeJS API reference documentation. https://nodejs.org/api
