export const ATTRIBUTE_RENAME_MIGRATION_MODES = [
  'always',
  'never',
  'prompt-after-edit',
  'prompt-before-save',
] as const;

export const MIGRATION_FILE_FORMATS = ['javascript', 'typescript'] as const;

export type AttributeRenameMigrationMode = (typeof ATTRIBUTE_RENAME_MIGRATION_MODES)[number];
export type MigrationFileFormat = (typeof MIGRATION_FILE_FORMATS)[number];

export interface RenameMigrationsConfig {
  /**
   * Attribute rename behavior. A contentTypes setting can be added alongside
   * this later without changing the public configuration shape.
   */
  attributes: AttributeRenameMigrationMode;
  migrationFile: {
    format: MigrationFileFormat;
  };
}

export interface ContentTypeBuilderConfig {
  renameMigrations: RenameMigrationsConfig;
}

type ContentTypeBuilderUserConfig = {
  renameMigrations?: {
    attributes?: AttributeRenameMigrationMode;
    migrationFile?: {
      format?: MigrationFileFormat;
    };
  };
};

export default {
  default: {
    renameMigrations: {
      attributes: 'prompt-before-save',
      migrationFile: {
        format: 'javascript',
      },
    },
  } satisfies ContentTypeBuilderConfig,
  validator(config: ContentTypeBuilderUserConfig) {
    const renameMigrations = config.renameMigrations;
    if (renameMigrations === undefined) {
      return;
    }

    if (
      renameMigrations.attributes !== undefined &&
      !ATTRIBUTE_RENAME_MIGRATION_MODES.includes(renameMigrations.attributes)
    ) {
      throw new Error(
        `[content-type-builder] 'renameMigrations.attributes' must be one of: ${ATTRIBUTE_RENAME_MIGRATION_MODES.join(
          ', '
        )}. Received: ${JSON.stringify(renameMigrations.attributes)}`
      );
    }

    const format = renameMigrations.migrationFile?.format;
    if (format !== undefined && !MIGRATION_FILE_FORMATS.includes(format)) {
      throw new Error(
        `[content-type-builder] 'renameMigrations.migrationFile.format' must be one of: ${MIGRATION_FILE_FORMATS.join(
          ', '
        )}. Received: ${JSON.stringify(format)}`
      );
    }
  },
};
