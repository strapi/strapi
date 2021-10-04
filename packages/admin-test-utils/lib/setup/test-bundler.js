'use strict';

// needed for regenerator-runtime
// (ES7 generator support is required by redux-saga)
require('@babel/polyfill');

const noop = () => {};
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
