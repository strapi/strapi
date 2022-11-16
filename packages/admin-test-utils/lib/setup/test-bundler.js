'use strict';

require('core-js/actual');

const noop = () => {};
// eslint-disable-next-line no-undef
Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });
