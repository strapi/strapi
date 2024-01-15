import { createCLI } from '../index';

const consoleMock = {
  error: jest.spyOn(console, 'error').mockImplementation(() => {}),
};

describe('commands', () => {
  afterEach(() => {
    consoleMock.error.mockClear();
  });

  describe('buildStrapiCommand', () => {
    it('loads all commands without error', () => {
      createCLI([]);
      expect(consoleMock.error).not.toHaveBeenCalled();
    });
  });
});
