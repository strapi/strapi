import type { Core, Data, Struct, UID } from '@strapi/types';

import { AUTOSAVE_UID } from '../constants';
import type { Autosave } from '../../../../shared/contracts';

interface AutosaveScope {
  userId: Data.ID;
  contentType: UID.ContentType;
  documentId: Data.ID;
  locale?: string | null;
}

interface AutosaveRow {
  id: Data.ID;
  contentType: UID.ContentType;
  documentId: Data.ID;
  locale: string;
  data: Autosave.AutosaveData;
  schema: Struct.SchemaAttributes | null;
  baseVersion: string | null;
  savedAt: Date | string;
}

interface AutosaveSnapshot extends Autosave.AutosaveEntry {
  schema: Struct.SchemaAttributes | null;
}

const toEntry = ({
  contentType,
  documentId,
  locale,
  data,
  schema,
  baseVersion,
  savedAt,
}: AutosaveRow): AutosaveSnapshot => ({
  contentType,
  documentId,
  locale: locale === '' ? null : locale,
  data,
  schema: schema ?? null,
  baseVersion: baseVersion ?? null,
  savedAt: new Date(savedAt).toISOString(),
});

const createAutosaveService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = strapi.db.query(AUTOSAVE_UID);

  const scopeWhere = ({ userId, contentType, documentId, locale }: AutosaveScope) => ({
    // Filtering through the relation (`user: { id }`) makes deleteMany add an admin_users join.
    // Both tables have document_id, which produces an ambiguous-column failure on SQLite. This
    // model owns the FK column, so scope it directly and keep every operation join-free.
    user_id: userId,
    contentType,
    documentId,
    locale: locale ?? '',
  });

  return {
    async findOne(scope: AutosaveScope): Promise<AutosaveSnapshot | null> {
      const row: AutosaveRow | null = await query.findOne({ where: scopeWhere(scope) });

      return row ? toEntry(row) : null;
    },

    async save(
      scope: AutosaveScope,
      {
        data,
        schema,
        baseVersion,
      }: {
        data: Autosave.AutosaveData;
        schema?: Struct.SchemaAttributes;
        baseVersion?: string;
      }
    ): Promise<AutosaveSnapshot> {
      const where = scopeWhere(scope);
      const savedAt = new Date();

      return strapi.db.transaction(async () => {
        const existing: { id: Data.ID }[] = await query.findMany({ select: ['id'], where });
        const [current, ...duplicates] = existing;

        // A unique index guards the scope, but a database that lost it (or a pre-existing row
        // from an older version) must not make every later save fail.
        if (duplicates.length > 0) {
          await query.deleteMany({ where: { id: { $in: duplicates.map(({ id }) => id) } } });
        }

        const row: AutosaveRow = current
          ? await query.update({
              where: { id: current.id },
              data: { data, schema: schema ?? null, baseVersion: baseVersion ?? null, savedAt },
            })
          : await query.create({
              data: {
                contentType: scope.contentType,
                documentId: scope.documentId,
                locale: scope.locale ?? '',
                data,
                schema: schema ?? null,
                baseVersion: baseVersion ?? null,
                savedAt,
                user: scope.userId,
              },
            });

        return toEntry(row);
      });
    },

    async delete(scope: AutosaveScope): Promise<void> {
      await query.deleteMany({ where: scopeWhere(scope) });
    },

    async deleteForDocument({
      contentType,
      documentId,
      locale,
    }: Pick<AutosaveScope, 'contentType' | 'documentId' | 'locale'>): Promise<void> {
      await query.deleteMany({
        where: {
          contentType,
          documentId,
          ...(typeof locale === 'string' ? { locale } : {}),
        },
      });
    },

    async deleteForUser(userId: Data.ID): Promise<void> {
      await query.deleteMany({ where: { user_id: userId } });
    },
  };
};

export { createAutosaveService };
export type { AutosaveScope, AutosaveSnapshot };
