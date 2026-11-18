import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errors } from '@strapi/database';

import { sync } from '../inverse-morph-relations';
import type { InverseMorphLinks } from '../inverse-morph-relations';

const NOTE_UID = 'api::note.note' as any;
const DOCUMENT_ID = 'doc1';

const createLinks = (rows: InverseMorphLinks['rows']): InverseMorphLinks[] => [
  {
    attributeName: 'remarks',
    tableName: 'remarks',
    idColumnName: 'subject_id',
    typeColumnName: 'subject_type',
    rows,
  },
];

/** Records each re-point update: `update(...).whereIn(...).where(...).transacting(...)` */
const createUpdateChain = () => {
  const chain: any = {};
  chain.from = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.whereIn = vi.fn().mockReturnValue(chain);
  chain.where = vi.fn().mockReturnValue(chain);
  chain.transacting = vi.fn().mockResolvedValue(1);
  return chain;
};

describe('inverse-morph-relations', () => {
  let chain: ReturnType<typeof createUpdateChain>;
  let findMany: ReturnType<typeof vi.fn>;

  const mockStrapi = (newVersions: { id: number; locale: string | null }[]) => {
    chain = createUpdateChain();
    findMany = vi.fn().mockResolvedValue(newVersions);

    (global as any).strapi = {
      db: {
        query: vi.fn().mockReturnValue({ findMany }),
        transaction: vi.fn(async (run: any) => run({ trx: 'trx' })),
        getConnection: vi.fn().mockReturnValue(chain),
      },
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('sync', () => {
    it('does nothing when the old versions own no link', async () => {
      mockStrapi([]);

      await sync(NOTE_UID, DOCUMENT_ID, [{ id: 1, locale: 'en' }], []);

      expect(findMany).not.toHaveBeenCalled();
      expect(chain.update).not.toHaveBeenCalled();
    });

    // The new versions come from the database, not from the publish response, whose fields
    // depend on the caller's `fields` param
    it('reads the new published versions of the document from the database', async () => {
      mockStrapi([{ id: 11, locale: 'en' }]);

      await sync(
        NOTE_UID,
        DOCUMENT_ID,
        [{ id: 1, locale: 'en' }],
        createLinks([{ id: 100, ownerId: 1 }])
      );

      expect(findMany).toHaveBeenCalledWith({
        where: { documentId: DOCUMENT_ID, publishedAt: { $ne: null } },
        select: ['id', 'locale'],
      });
    });

    it('re-points each row to the new version of its owner locale', async () => {
      mockStrapi([
        { id: 11, locale: 'en' },
        { id: 12, locale: 'fr' },
      ]);

      await sync(
        NOTE_UID,
        DOCUMENT_ID,
        [
          { id: 1, locale: 'en' },
          { id: 2, locale: 'fr' },
        ],
        createLinks([
          { id: 100, ownerId: 1 },
          { id: 101, ownerId: 2 },
          { id: 102, ownerId: 1 },
        ])
      );

      expect(chain.update).toHaveBeenCalledTimes(2);
      expect(chain.update).toHaveBeenNthCalledWith(1, { subject_id: 11, subject_type: NOTE_UID });
      expect(chain.whereIn).toHaveBeenNthCalledWith(1, 'id', [100, 102]);
      expect(chain.update).toHaveBeenNthCalledWith(2, { subject_id: 12, subject_type: NOTE_UID });
      expect(chain.whereIn).toHaveBeenNthCalledWith(2, 'id', [101]);
    });

    it('matches a non-localized version, whose locale is null', async () => {
      mockStrapi([{ id: 11, locale: null }]);

      await sync(
        NOTE_UID,
        DOCUMENT_ID,
        [{ id: 1, locale: null }],
        createLinks([{ id: 100, ownerId: 1 }])
      );

      expect(chain.update).toHaveBeenCalledWith({ subject_id: 11, subject_type: NOTE_UID });
    });

    // Another write can re-own a row between `load` and `sync`: only rows still ownerless move
    it('updates only the rows that no entry owns', async () => {
      mockStrapi([{ id: 11, locale: 'en' }]);

      await sync(
        NOTE_UID,
        DOCUMENT_ID,
        [{ id: 1, locale: 'en' }],
        createLinks([{ id: 100, ownerId: 1 }])
      );

      expect(chain.where).toHaveBeenCalledWith('subject_id', null);
    });

    it('throws an InvalidRelationError when an owner has no new version', async () => {
      mockStrapi([]);

      await expect(
        sync(
          NOTE_UID,
          DOCUMENT_ID,
          [{ id: 1, locale: 'en' }],
          createLinks([{ id: 100, ownerId: 1 }])
        )
      ).rejects.toBeInstanceOf(errors.InvalidRelationError);
      expect(chain.update).not.toHaveBeenCalled();
    });
  });
});
