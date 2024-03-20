/* eslint-disable node/no-callback-literal */
// @ts-nocheck
import { curry } from 'lodash/fp';

import { Relation } from './types';
import { traverseRelation } from './traverse-relation';

const isNumeric = (value: any): value is number => {
  if (Array.isArray(value)) return false; // Handle [1, 'docId'] case
  const parsed = parseInt(value, 10);
  return !Number.isNaN(parsed);
};

const mapRelation = async (
  callback: (relation: any) => any,
  relation: Relation
): Promise<Relation> => {
  /**
   * Traverse relation input and map it with a consistent format.
   */
  return traverseRelation(
    {
      onShortHand(relation) {
        // Assume a regular id if it's a number
        if (isNumeric(relation)) {
          return callback({ id: relation });
        }

        // Assume a documentId if it's a string
        if (typeof relation === 'string') {
          return callback({ documentId: relation });
        }

        // Not a valid relation
        return callback(null);
      },
      onLongHand(relation) {
        return callback(relation);
      },
      async onPositionBefore(position) {
        const relationToMap = { documentId: position.before, ...position };
        const mappedRelation = await callback(relationToMap);
        position.before = mappedRelation.documentId;
        return position;
      },
      async onPositionAfter(relation) {
        const relationToMap = { documentId: relation.after, ...relation };
        const mappedRelation = await callback(relationToMap);
        relation.after = mappedRelation.documentId;
        return relation;
      },
      onDefault() {
        return callback(null);
      },
    },
    relation
  );
};

const mapRelationCurried = curry(mapRelation);

export { mapRelationCurried as mapRelation };
