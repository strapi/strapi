import { curry } from 'lodash/fp';

import type { UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import { ID, LongHandDocument } from '../utils/types';
import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';

interface Options {
  uid: UID.Schema;
  locale?: string | null;
  status?: 'draft' | 'published';
  allowMissingId?: boolean; // Whether to ignore missing ids and not throw any error
}

/**
 * Get the entry ids for a given documentId.
 */
const getRelationIds = curry(
  (idMap: IdMap, targetUid: UID.Schema, source: Options, relation: LongHandDocument) => {
    // locale to connect to
    const targetLocale = getRelationTargetLocale(relation, {
      targetUid,
      sourceUid: source.uid,
      sourceLocale: source.locale,
    });

    // status(es) to connect to
    const targetStatus = getRelationTargetStatus(relation, {
      targetUid,
      sourceUid: source.uid,
      sourceStatus: source.status,
    });

    const ids: ID[] = [];

    // Find mapping between documentID -> id(s).
    // There are scenarios where a single documentID can map to multiple ids.
    // e.g when connecting Non DP -> DP and connecting to both the draft and publish version at the same time
    for (const tStatus of targetStatus) {
      const entryId = idMap.get({
        uid: targetUid,
        documentId: relation.documentId,
        locale: targetLocale,
        status: tStatus,
      });

      if (entryId) ids.push(entryId);
    }

    if (!ids.length && !source.allowMissingId) {
      throw new errors.ValidationError(
        `Document with id "${relation.documentId}", locale "${targetLocale}" not found`
      );
    }

    return ids;
  }
);

/**
 * Iterate over all relations of a data object and transform all relational document ids to entity ids.
 */
const transformDataIdsVisitor = (idMap: IdMap, data: Record<string, any>, source: Options) => {
  return traverseEntityRelations(
    async ({ key, value, attribute }, { set }) => {
      if (!attribute) {
        return;
      }

      // Find relational attributes, and return the document ids
      const targetUid = attribute.target!;
      const getIds = getRelationIds(idMap, targetUid, source);

      // Transform the relation documentId to entity id
      const newRelation = await mapRelation((relation) => {
        if (!relation || !relation.documentId) {
          return relation;
        }

        const ids = getIds(relation);

        // Handle positional arguments
        const position = { ...relation.position };

        if (position.before) {
          const beforeRelation = { ...relation, ...position, documentId: position.before };
          position.before = getIds(beforeRelation).at(0);
        }

        if (position.after) {
          const afterRelation = { ...relation, ...position, documentId: position.after };
          position.after = getIds(afterRelation).at(0);
        }

        // Transform all ids to new relations
        return ids?.map((id) => {
          const newRelation = { id } as typeof relation;
          if (relation.position) {
            newRelation.position = position;
          }

          return newRelation;
        });
      }, value as any);

      set(key, newRelation as any);
    },
    { schema: strapi.getModel(source.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { transformDataIdsVisitor };
