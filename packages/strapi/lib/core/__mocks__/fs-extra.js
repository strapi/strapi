'use strict';

module.exports = {
  ensureFile: jest.fn(() => Promise.resolve()),
  writeFile: jest.fn(() => Promise.resolve()),
};
