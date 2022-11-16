'use strict';

// See https://github.com/swc-project/swc/issues/6460
// SWC is not able to include the core-js polyfill for 
// array/at automatically at the moment of writing, which
// makes some frontend tests fail on node@14.
require('core-js/actual/array/at');

const noop = () => {};
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
