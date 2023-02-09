/* eslint-disable no-undef */

'use strict';

// Codemirror inner dependency, reference: https://github.com/jsdom/jsdom/issues/3002
// Otherwise it throws: TypeError: range(...).getBoundingClientRect is not a function

document.createRange = () => {
  const range = new Range();
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};
