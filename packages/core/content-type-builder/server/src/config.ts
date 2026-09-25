export const ATTRIBUTE_RENAME_MIGRATION_MODES = [
  'always',
  'never',
  'prompt-after-edit',
  'prompt-before-save',
] as const;

export type AttributeRenameMigrationMode = (typeof ATTRIBUTE_RENAME_MIGRATION_MODES)[number];

export interface RenameMigrationsConfig {
  /**
   * Attribute rename behavior. A contentTypes setting can be added alongside
   * this later without changing the public configuration shape.
   */
  attributes: AttributeRenameMigrationMode;
}

export interface ContentTypeBuilderConfig {
  renameMigrations: RenameMigrationsConfig;
}

type ContentTypeBuilderUserConfig = {
  renameMigrations?: {
    attributes?: AttributeRenameMigrationMode;
  };
};

export default {
  default: {
    renameMigrations: {
      attributes: 'prompt-before-save',
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
  },
};
