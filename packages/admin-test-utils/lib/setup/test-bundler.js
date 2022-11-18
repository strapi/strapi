'use strict';

// See https://github.com/swc-project/swc/issues/6460
// SWC is not able to include the core-js polyfill
// relieably, which causes flaky tests on node@14.
// On theory this should be solved by the `env` transform
// configuration of @swc/jest
require('core-js/actual');

const noop = () => {};
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
