import config from '../index';

describe('the plugin configuration', () => {
  describe('by default', () => {
    it('lets the licence alone decide how many spaces there may be', () => {
      expect(config.default.maxSpaces).toBeNull();
    });

    it('assigns existing content to a first space', () => {
      // Leaving it shared with every space is almost never what a project
      // wants, so it has to be asked for.
      expect(config.default.migrateOnBootstrap).toBe(true);
    });
  });

  describe('validation', () => {
    it('accepts the defaults', () => {
      expect(() => config.validator(config.default)).not.toThrow();
    });

    it('accepts an empty configuration', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    it('accepts a positive number of spaces', () => {
      expect(() => config.validator({ maxSpaces: 3 })).not.toThrow();
    });

    it.each([0, -1, 1.5, '3', true])('refuses %p as a number of spaces', (maxSpaces) => {
      expect(() => config.validator({ maxSpaces })).toThrow(
        /"maxSpaces" must be null or a positive integer/
      );
    });

    it('refuses a migration flag that is not a boolean', () => {
      expect(() => config.validator({ migrateOnBootstrap: 'yes' })).toThrow(
        /"migrateOnBootstrap" must be a boolean/
      );
    });

    it('accepts turning the migration off', () => {
      expect(() => config.validator({ migrateOnBootstrap: false })).not.toThrow();
    });
  });
});
