'use strict';

const types = require('../../types');
const { getJoinTableName } = require('../../metadata/relations');

const getLinksWithoutMappedBy = (db) => {
  const relationsToUpdate = {};

  db.metadata.forEach((contentType) => {
    const attributes = contentType.attributes;

    // For each relation attribute, add the joinTable name to tablesToUpdate
    Object.values(attributes).forEach((attribute) => {
      if (!types.isRelation(attribute.type)) return;

      if (attribute.inversedBy) {
        const invRelation = db.metadata.get(attribute.target).attributes[attribute.inversedBy];

        // Both relations use inversedBy.
        if (invRelation?.inversedBy) {
          relationsToUpdate[attribute.joinTable.name] = {
            relation: attribute,
            invRelation,
          };
        }
      }
    });
  });

  return Object.values(relationsToUpdate);
};

const isLinkTableEmpty = async (db, linkTableName) => {
  // If the table doesn't exist, it's empty
  const exists = await db.getConnection().schema.hasTable(linkTableName);
  if (!exists) return true;

  const result = await db.getConnection().count('* as count').from(linkTableName);
  return result.count === 0;
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
const validateBidirectionalRelations = async (db) => {
  const invalidLinks = getLinksWithoutMappedBy(db);
  const errorList = [];

  for (const { relation, invRelation } of invalidLinks) {
    // Generate the join table name based on the relation target
    // table and attribute name.
    const inverseJoinTableName = getJoinTableName(
      db.metadata.get(relation.target).tableName,
      relation.inversedBy
    );
    const joinTableName = getJoinTableName(
      db.metadata.get(invRelation.target).tableName,
      invRelation.inversedBy
    );

    const contentType = db.metadata.get(invRelation.target);
    const invContentType = db.metadata.get(relation.target);

    // If both sides use inversedBy
    if (relation.inversedBy && invRelation.inversedBy) {
      const linkTableEmpty = await isLinkTableEmpty(db, joinTableName);
      const inverseLinkTableEmpty = await isLinkTableEmpty(db, inverseJoinTableName);

      if (linkTableEmpty) {
        errorList.push(
          `Error on attribute "${relation.inversedBy}" in model "${contentType.tableName}"(${contentType.uid}):` +
            ` One of the sides of the relationship must be the owning side. You should use mappedBy` +
            ` instead of inversedBy in the relation "${relation.inversedBy}".`
        );
      } else if (inverseLinkTableEmpty) {
        // Its safe to delete the inverse join table
        errorList.push(
          `Error on attribute "${invRelation.inversedBy}" in model "${invContentType.tableName}"(${invContentType.uid}):` +
            ` One of the sides of the relationship must be the owning side. You should use mappedBy` +
            ` instead of inversedBy in the relation "${invRelation.inversedBy}".`
        );
      } else {
        // Both sides have data in the join table
      }
    }
  }

  return errorList;
};

module.exports = {
  validateBidirectionalRelations,
};
