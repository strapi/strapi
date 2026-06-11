import config, { RENAME_MIGRATION_MODES } from '../config';

describe('content-type-builder config', () => {
  describe('default', () => {
    it("defaults renameMigrations to 'modal'", () => {
      expect(config.default.renameMigrations).toBe('modal');
    });
  });

  describe('validator', () => {
    it.each(RENAME_MIGRATION_MODES)('accepts the valid mode "%s"', (mode) => {
      expect(() => config.validator({ renameMigrations: mode })).not.toThrow();
    });

    it('accepts a config without renameMigrations', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    it('throws for an unknown renameMigrations value', () => {
      expect(() => config.validator({ renameMigrations: 'sometimes' as any })).toThrow(
        /renameMigrations/
      );
    });
  });
});
