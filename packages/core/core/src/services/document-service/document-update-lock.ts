interface LockBuilder {
  select(columns: string[]): this;
  where(where: Record<string, unknown>): this;
  orderBy(orderBy: { id: 'asc' }): this;
  limit(limit: number): this;
  forNoKeyUpdate(): this;
  execute(): Promise<unknown>;
}

interface Database {
  dialect: {
    client: string;
  };
  lockDocumentId?(documentId: string): Promise<void>;
  deleteDocumentLock?(documentId: string): Promise<void>;
}

const hasLockedRow = (result: unknown) => {
  if (Array.isArray(result)) {
    return result.length > 0;
  }

  return result != null;
};

/**
 * Serialize two updates of the same document without locking every locale.
 *
 * MySQL locks a row in its internal lock table. Nothing references that row,
 * so its exclusive lock does not block foreign-key checks. Postgres locks the
 * row being written with FOR NO KEY UPDATE. SQLite ignores row locks.
 */
export const lockDocumentForUpdate = async ({
  db,
  queryBuilder,
  uid,
  documentId,
  lookup,
}: {
  db: Database;
  queryBuilder: (uid: string) => LockBuilder;
  uid: string;
  documentId: string;
  lookup?: Record<string, unknown> | null;
}) => {
  if (db.dialect.client === 'mysql') {
    if (!db.lockDocumentId) {
      throw new Error('MySQL document lock is unavailable');
    }

    await db.lockDocumentId(documentId);
    return;
  }

  const specific: Record<string, unknown> = { documentId };
  const locale = lookup?.locale;

  if (typeof locale === 'string' && locale !== '*') {
    specific.locale = locale;
  }

  if (lookup && Object.prototype.hasOwnProperty.call(lookup, 'publishedAt')) {
    specific.publishedAt = lookup.publishedAt;
  }

  const locked = await queryBuilder(uid).select(['id']).where(specific).forNoKeyUpdate().execute();

  if (hasLockedRow(locked)) {
    return;
  }

  await queryBuilder(uid)
    .select(['id'])
    .where({ documentId })
    .orderBy({ id: 'asc' })
    .limit(1)
    .forNoKeyUpdate()
    .execute();
};

/**
 * Drop the MySQL lock row of a document that has no row left. Other dialects
 * lock content rows, so they have nothing to clean up.
 */
export const releaseDocumentLock = async ({
  db,
  documentId,
  keepIf,
}: {
  db: Database;
  documentId: string;
  /** Checked on MySQL only, so other dialects skip the extra query. */
  keepIf?: () => Promise<boolean>;
}) => {
  if (db.dialect.client !== 'mysql') {
    return;
  }

  if (keepIf && (await keepIf())) {
    return;
  }

  if (!db.deleteDocumentLock) {
    throw new Error('MySQL document lock is unavailable');
  }

  await db.deleteDocumentLock(documentId);
};
