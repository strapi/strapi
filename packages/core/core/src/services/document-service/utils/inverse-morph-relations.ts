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

export { load };
export type { InverseMorphLinks };
