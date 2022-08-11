'use strict';

// needed for regenerator-runtime
require('@babel/polyfill');

const noop = () => {};
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
