'use strict';

const { buildStrapiCommand } = require('../index');

const consoleMock = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('commands', () => {
  afterEach(() => {
    consoleMock.error.mockClear();
  });

  describe('buildStrapiCommand', () => {
    it('loads all commands without error', () => {
      buildStrapiCommand();
      expect(consoleMock.error).not.toHaveBeenCalled();
    });
  });
});
