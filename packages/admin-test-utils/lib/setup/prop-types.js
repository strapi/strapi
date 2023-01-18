'use strict';

const { format } = require('util');

const originalConsoleError = console.error;

beforeEach(() => {
  console.error = (...args) => {
    originalConsoleError(...args);

    const message = format(...args);

    if (/(Invalid prop|Failed prop type)/gi.test(message)) {
      throw new Error(message);
    }
  };
});

afterEach(() => {
  console.error = originalConsoleError;
});
