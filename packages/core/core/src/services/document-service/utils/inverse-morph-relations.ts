import { errors } from '@strapi/database';
import type { Data, UID } from '@strapi/types';

/**
 * Target rows that link to an entry through the morph columns of a `morphToOne`.
 */
type InverseMorphLinks = {
  /** Inverse `morphOne` / `morphMany` attribute of the entry */
  attributeName: string;
  /** Table of the target rows */
  tableName: string;
  /** Morph id column of the target rows */
  idColumnName: string;
  /** Morph type column of the target rows */
  typeColumnName: string;
  rows: { id: Data.ID; ownerId: Data.ID }[];
};

/**
 * Loads the links that the given entries own through an inverse `morphOne` / `morphMany` whose
 * target is a `morphToOne`. They live in the morph columns of the target rows, not in a join
 * table, so deleting an entry clears them (entity-manager `deleteRelations`).
 */
const load = async (uid: UID.ContentType, ids: Data.ID[]): Promise<InverseMorphLinks[]> => {
  if (ids.length === 0) {
    return [];
  }

  const links: InverseMorphLinks[] = [];
  const { attributes } = strapi.db.metadata.get(uid);

  await strapi.db.transaction(async ({ trx }) => {
    for (const [attributeName, attribute] of Object.entries(attributes) as [string, any][]) {
      if (
        attribute.type !== 'relation' ||
        (attribute.relation !== 'morphOne' && attribute.relation !== 'morphMany')
      ) {
        continue;
      }

      const targetMetadata = strapi.db.metadata.get(attribute.target);
      const targetAttribute = targetMetadata.attributes[attribute.morphBy] as any;

      if (targetAttribute?.type !== 'relation' || targetAttribute.relation !== 'morphToOne') {
        continue;
      }

      const { idColumn, typeColumn } = targetAttribute.morphColumn;

      const rows = await strapi.db
        .getConnection()
        .select('id', idColumn.name)
        .from(targetMetadata.tableName)
        .whereIn(idColumn.name, ids)
        .where(typeColumn.name, uid)
        .transacting(trx);

      if (rows.length > 0) {
        links.push({
          attributeName,
          tableName: targetMetadata.tableName,
          idColumnName: idColumn.name,
          typeColumnName: typeColumn.name,
          rows: rows.map((row: Record<string, Data.ID>) => ({
            id: row.id,
            ownerId: row[idColumn.name],
          })),
        });
      }
    }
  });

  return links;
};

/**
 * Re-points the target rows loaded by `load` to the new published version of their owner,
 * matched by locale. Run it after the old versions are deleted (which cleared these rows) and the
 * new versions are created.
 *
 * The new versions are read from the database, not taken from the publish response: the caller's
 * `fields` param can leave `locale` out of the response.
 */
const sync = async (
  uid: UID.ContentType,
  documentId: string,
  oldVersions: { id: Data.ID; locale?: string | null }[],
  links: InverseMorphLinks[]
) => {
  if (links.length === 0) {
    return;
  }

  // The old published versions are deleted, so the published rows are the new versions
  const newVersions: { id: Data.ID; locale: string | null }[] = await strapi.db
    .query(uid)
    .findMany({
      where: { documentId, publishedAt: { $ne: null } },
      select: ['id', 'locale'],
    });

  const newIdsByOldId = new Map<string, Data.ID>();

  for (const oldVersion of oldVersions) {
    const newVersion = newVersions.find(
      (entry) => (entry.locale ?? null) === (oldVersion.locale ?? null)
    );

    if (newVersion !== undefined) {
      newIdsByOldId.set(String(oldVersion.id), newVersion.id);
    }
  }

  await strapi.db.transaction(async ({ trx }) => {
    for (const { attributeName, tableName, idColumnName, typeColumnName, rows } of links) {
      const rowIdsByNewId = new Map<Data.ID, Data.ID[]>();

      for (const row of rows) {
        const newId = newIdsByOldId.get(String(row.ownerId));

        // An InvalidRelationError reaches the client as a 400 with this message, not a 500
        if (newId === undefined) {
          throw new errors.InvalidRelationError(
            `Cannot keep the ${uid}.${attributeName} links of entry ${row.ownerId}: it has no new version`
          );
        }

        rowIdsByNewId.set(newId, [...(rowIdsByNewId.get(newId) ?? []), row.id]);
      }

      for (const [newId, rowIds] of rowIdsByNewId) {
        await strapi.db
          .getConnection()
          .from(tableName)
          .update({ [idColumnName]: newId, [typeColumnName]: uid })
          .whereIn('id', rowIds)
          // Deleting the old version cleared these rows. Another write may have re-owned one
          // since `load`: leave it to its new owner.
          .where(idColumnName, null)
          .transacting(trx);
      }
    }
  });
};

export { load, sync };
export type { InverseMorphLinks };
