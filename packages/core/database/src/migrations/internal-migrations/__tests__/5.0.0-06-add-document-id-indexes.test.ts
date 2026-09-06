import type { Knex } from 'knex';

import { addDocumentIdIndexes } from '../5.0.0-06-add-document-id-indexes';

describe('addDocumentIdIndexes migration', () => {
  it('is a no-op (indexes are owned by schema sync / model metadata)', async () => {
    const knex = {} as unknown as Knex.Transaction;
    const db = {} as any;

    await expect(addDocumentIdIndexes.up(knex, db)).resolves.toBeUndefined();
  });
});
