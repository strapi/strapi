import config, { ATTRIBUTE_RENAME_MIGRATION_MODES, MIGRATION_FILE_FORMATS } from '../config';

describe('content-type-builder config', () => {
  describe('default', () => {
    it('defaults to a before-save prompt and JavaScript files', () => {
      expect(config.default.renameMigrations).toEqual({
        attributes: 'prompt-before-save',
        migrationFile: { format: 'javascript' },
      });
    });
  });

  describe('validator', () => {
    it.each(ATTRIBUTE_RENAME_MIGRATION_MODES)('accepts the valid mode "%s"', (attributes) => {
      expect(() =>
        config.validator({
          renameMigrations: { attributes, migrationFile: { format: 'javascript' } },
        })
      ).not.toThrow();
    });

    it.each(MIGRATION_FILE_FORMATS)('accepts the migration format "%s"', (format) => {
      expect(() =>
        config.validator({
          renameMigrations: { attributes: 'always', migrationFile: { format } },
        })
      ).not.toThrow();
    });

    it('accepts either nested setting without requiring the other', () => {
      expect(() =>
        config.validator({ renameMigrations: { attributes: 'prompt-after-edit' } })
      ).not.toThrow();
      expect(() =>
        config.validator({ renameMigrations: { migrationFile: { format: 'typescript' } } })
      ).not.toThrow();
    });

    it('accepts a config without renameMigrations', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    it('throws for an unknown attribute mode', () => {
      expect(() =>
        config.validator({
          // @ts-expect-error testing runtime validation
          renameMigrations: { attributes: 'sometimes', migrationFile: { format: 'javascript' } },
        })
      ).toThrow(/renameMigrations\.attributes/);
    });

    it('throws for an unknown migration format', () => {
      expect(() =>
        config.validator({
          renameMigrations: {
            attributes: 'always',
            // @ts-expect-error testing runtime validation
            migrationFile: { format: 'coffee' },
          },
        })
      ).toThrow(/renameMigrations\.migrationFile\.format/);
    });
  });
});
