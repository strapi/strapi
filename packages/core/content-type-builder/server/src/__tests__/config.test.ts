import config, { ATTRIBUTE_RENAME_MIGRATION_MODES } from '../config';

describe('content-type-builder config', () => {
  describe('default', () => {
    it('defaults to a before-save prompt', () => {
      expect(config.default.renameMigrations).toEqual({
        attributes: 'prompt-before-save',
      });
    });
  });

  describe('validator', () => {
    it.each(ATTRIBUTE_RENAME_MIGRATION_MODES)('accepts the valid mode "%s"', (attributes) => {
      expect(() =>
        config.validator({
          renameMigrations: { attributes },
        })
      ).not.toThrow();
    });

    it('accepts a config without renameMigrations', () => {
      expect(() => config.validator({})).not.toThrow();
    });

    it('throws for an unknown attribute mode', () => {
      expect(() =>
        config.validator({
          // @ts-expect-error testing runtime validation
          renameMigrations: { attributes: 'sometimes' },
        })
      ).toThrow(/renameMigrations\.attributes/);
    });
  });
});
