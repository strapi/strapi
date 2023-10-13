import { getJoinTableName } from '../../metadata';

import type { Database } from '../..';
import type { Relation } from '../../types';

type Link = {
  relation: Relation.Bidirectional & { inversedBy: string };
  invRelation: Relation.Bidirectional & { inversedBy: string };
};

const getLinksWithoutMappedBy = (db: Database): Array<Link> => {
  const relationsToUpdate: Record<string, Link> = {};

  db.metadata.forEach((contentType) => {
    const attributes = contentType.attributes;

    // For each relation attribute, add the joinTable name to tablesToUpdate
    Object.values(attributes).forEach((attribute) => {
      if (attribute.type !== 'relation') {
        return;
      }

      if ('inversedBy' in attribute && attribute.inversedBy) {
        const invRelation = db.metadata.get(attribute.target).attributes[attribute.inversedBy];

        // Both relations use inversedBy.
        if ('inversedBy' in invRelation && invRelation.inversedBy) {
          relationsToUpdate[attribute.joinTable.name] = {
            relation: attribute as Relation.Bidirectional & { inversedBy: string },
            invRelation: invRelation as Relation.Bidirectional & { inversedBy: string },
          };
        }
      }
    });
  });

  return Object.values(relationsToUpdate);
};

const isLinkTableEmpty = async (db: Database, linkTableName: string) => {
  // If the table doesn't exist, it's empty
  const exists = await db.getSchemaConnection().hasTable(linkTableName);
  if (!exists) return true;

  const result = await db.getConnection().from(linkTableName).count('* as count');
  return Number(result[0].count) === 0;
};

/**
 * Validates bidirectional relations before starting the server.
 * - If both sides use inversedBy, one of the sides must switch to mappedBy.
 *    When this happens, two join tables exist in the database.
 *    This makes sure you switch the side which does not delete any data.
 *
 * @param {*} db
 * @return {*}
 */
export const validateBidirectionalRelations = async (db: Database) => {
  const invalidLinks = getLinksWithoutMappedBy(db);

  for (const { relation, invRelation } of invalidLinks) {
    const contentType = db.metadata.get(invRelation.target);
    const invContentType = db.metadata.get(relation.target);

    // Generate the join table name based on the relation target table and attribute name.
    const joinTableName = getJoinTableName(contentType.tableName, invRelation.inversedBy);
    const inverseJoinTableName = getJoinTableName(invContentType.tableName, relation.inversedBy);

    const joinTableEmpty = await isLinkTableEmpty(db, joinTableName);
    const inverseJoinTableEmpty = await isLinkTableEmpty(db, inverseJoinTableName);

    if (joinTableEmpty) {
      process.emitWarning(
        `Error on attribute "${invRelation.inversedBy}" in model "${contentType.singularName}" (${contentType.uid}).` +
          ` Please modify your ${contentType.singularName} schema by renaming the key "inversedBy" to "mappedBy".` +
          ` Ex: { "inversedBy": "${relation.inversedBy}" } -> { "mappedBy": "${relation.inversedBy}" }`
      );
    } else if (inverseJoinTableEmpty) {
      // Its safe to delete the inverse join table
      process.emitWarning(
        `Error on attribute "${relation.inversedBy}" in model "${invContentType.singularName}" (${invContentType.uid}).` +
          ` Please modify your ${invContentType.singularName} schema by renaming the key "inversedBy" to "mappedBy".` +
          ` Ex: { "inversedBy": "${invRelation.inversedBy}" } -> { "mappedBy": "${invRelation.inversedBy}" }`
      );
    } else {
      // Both sides have data in the join table
    }
  }
};
