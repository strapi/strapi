interface LockBuilder {
  select(columns: string[]): this;
  where(where: Record<string, unknown>): this;
  orderBy(orderBy: { id: 'asc' }): this;
  limit(limit: number): this;
  forNoKeyUpdate(): this;
  execute(): Promise<unknown>;
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
 * The row being written is locked on its own. A missing locale has no row yet,
 * so one existing row of the document is locked instead and both creates wait
 * on that row. Locking every locale makes MySQL cross-links deadlock: the
 * foreign-key check needs a shared lock on a row the other transaction holds
 * exclusively.
 */
export const lockDocumentForUpdate = async ({
  queryBuilder,
  uid,
  documentId,
  lookup,
}: {
  queryBuilder: (uid: string) => LockBuilder;
  uid: string;
  documentId: string;
  lookup?: Record<string, unknown> | null;
}) => {
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
