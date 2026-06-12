/**
 * Controls whether renaming an attribute (and, later, a content-type/component)
 * in the Content-Type Builder generates a database migration that preserves the
 * underlying data instead of letting schema-sync drop and recreate the column.
 *
 * - 'never':  never generate a rename migration (legacy behaviour).
 * - 'always': generate a migration for every rename, without prompting.
 * - 'prompt': prompt the user per rename (default).
 */
export const RENAME_MIGRATION_MODES = ['prompt', 'always', 'never'] as const;

export type RenameMigrationMode = (typeof RENAME_MIGRATION_MODES)[number];

export interface ContentTypeBuilderConfig {
  renameMigrations: RenameMigrationMode;
}

export default {
  default: {
    renameMigrations: 'prompt',
  } satisfies ContentTypeBuilderConfig,
  validator(config: Partial<ContentTypeBuilderConfig>) {
    if (
      config.renameMigrations !== undefined &&
      !RENAME_MIGRATION_MODES.includes(config.renameMigrations)
    ) {
      throw new Error(
        `[content-type-builder] 'renameMigrations' must be one of: ${RENAME_MIGRATION_MODES.join(
          ', '
        )}. Received: ${JSON.stringify(config.renameMigrations)}`
      );
    }
  },
};
