import { curry } from 'lodash/fp';

import { UID } from '@strapi/types';

import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';
import { LongHandDocument } from '../utils/types';

interface Options {
  uid: UID.Schema;
  locale?: string | null;
  status?: 'draft' | 'published';
}

/**
 * Load a relation documentId into the idMap.
 */
const addRelationDocId = curry(
  (idMap: IdMap, targetUid: UID.Schema, source: Options, relation: LongHandDocument) => {
    const targetLocale = getRelationTargetLocale(relation, {
      targetUid,
      sourceUid: source.uid,
      sourceLocale: source.locale,
    });

    const targetStatus = getRelationTargetStatus(relation, {
      targetUid,
      sourceUid: source.uid,
      sourceStatus: source.status,
    });

    targetStatus.forEach((status) => {
      idMap.add({
        uid: targetUid,
        documentId: relation.documentId,
        locale: targetLocale,
        status,
      });
    });
  }
);

/**
 * Iterate over all relations of a data object and extract all relational document ids.
 * Those will later be transformed to entity ids.
 */
const extractDataIds = (idMap: IdMap, data: Record<string, any>, source: Options) => {
  return traverseEntityRelations(
    async ({ attribute, value }) => {
      if (!attribute) {
        return;
      }

      const targetUid = attribute.target!;
      const addDocId = addRelationDocId(idMap, targetUid, source);

      return mapRelation((relation) => {
        if (!relation || !relation.documentId) {
          return relation;
        }

        addDocId(relation);

        // Handle positional arguments
        const position = relation.position;

        if (position?.before) {
          addDocId({ ...relation, ...position, documentId: position.before });
        }

        if (position?.after) {
          addDocId({ ...relation, ...position, documentId: position.after });
        }

        return relation;
      }, value as any);
    },
    { schema: strapi.getModel(source.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { extractDataIds };
