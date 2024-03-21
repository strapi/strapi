/* eslint-disable node/no-callback-literal */
import { curry } from 'lodash/fp';

import { UID } from '@strapi/types';
import { traverseEntity } from '@strapi/utils';

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
      onElse(relation) {
        // Invalid relation
        return callback(relation);
      },
    },
    relation
  );
};

type TraverseEntity = Parameters<typeof traverseEntity>;

/**
 * Same as `traverseEntity` but only for relations.
 */
const traverseEntityRelations = async (
  visitor: TraverseEntity[0],
  options: TraverseEntity[1],
  data: TraverseEntity[2]
) => {
  return traverseEntity(
    async (options, utils) => {
      if (options.attribute.type !== 'relation') {
        return;
      }

      // TODO: Handle morph relations (they have multiple targets)
      const target = options.attribute.target as UID.Schema | undefined;
      if (!target) {
        return;
      }

      return visitor(options, utils);
    },
    options,
    data
  );
};

const mapRelationCurried = curry(mapRelation);
const traverseEntityRelationsCurried = curry(traverseEntityRelations);

export {
  mapRelationCurried as mapRelation,
  traverseEntityRelationsCurried as traverseEntityRelations,
};
