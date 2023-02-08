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
        if (invRelation.inversedBy) {
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
  const exists = await db.getSchemaConnection().hasTable(linkTableName);
  if (!exists) return true;

  const result = await db.getConnection().count('* as count').from(linkTableName);
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
const validateBidirectionalRelations = async (db) => {
  const invalidLinks = getLinksWithoutMappedBy(db);
  const errorList = [];

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

  return errorList;
};

module.exports = {
  validateBidirectionalRelations,
};
