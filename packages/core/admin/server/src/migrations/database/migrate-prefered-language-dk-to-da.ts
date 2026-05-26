const ADMIN_USERS_TABLE = 'admin_users';
const PREFERED_LANGUAGE_COLUMN = 'prefered_language';

type MigrationTransaction = {
  schema: {
    hasTable(tableName: string): Promise<boolean>;
    hasColumn(tableName: string, columnName: string): Promise<boolean>;
  };
  (tableName: string): {
    where(
      columnName: string,
      value: string
    ): {
      update(values: Record<string, string>): Promise<unknown>;
    };
  };
};

type Migration = {
  name: string;
  up(trx: MigrationTransaction): Promise<void>;
  down(): Promise<void>;
};

/**
 * Migrates persisted admin UI language from the legacy Danish code `dk` to ISO 639-1 `da`.
 */
export const migrateAdminPreferedLanguageDkToDa: Migration = {
  name: 'admin::migrate-prefered-language-dk-to-da',
  async up(trx) {
    const hasTable = await trx.schema.hasTable(ADMIN_USERS_TABLE);

    if (!hasTable) {
      return;
    }

    const hasColumn = await trx.schema.hasColumn(ADMIN_USERS_TABLE, PREFERED_LANGUAGE_COLUMN);

    if (!hasColumn) {
      return;
    }

    await trx(ADMIN_USERS_TABLE)
      .where(PREFERED_LANGUAGE_COLUMN, 'dk')
      .update({ [PREFERED_LANGUAGE_COLUMN]: 'da' });
  },
  async down() {
    throw new Error('not implemented');
  },
};
