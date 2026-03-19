import { curry } from 'lodash/fp';

import type { UID } from '@strapi/types';
import { relations } from '@strapi/utils';
import { IdMap } from '../../id-map';
import { getRelationTargetLocale } from '../utils/i18n';
import { getRelationTargetStatus } from '../utils/dp';
import { mapRelation, traverseEntityRelations } from '../utils/map-relation';
import { LongHandDocument } from '../utils/types';

const { isPolymorphic } = relations;

interface Options {
  uid: UID.Schema;
  locale?: string | null;
  status?: 'draft' | 'published';
}

/**
 * Load a relation documentId into the idMap.
 */
const addRelationDocId = curry(
  (idMap: IdMap, source: Options, targetUid: UID.Schema, relation: LongHandDocument) => {
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
      const isPolymorphicRelation = isPolymorphic(attribute);
      const addDocId = addRelationDocId(idMap, source);

      return mapRelation((relation) => {
        if (!relation || !relation.documentId) {
          return relation;
        }

        // Regular relations will always target the same target
        // if its a polymorphic relation we need to get it from the data itself
        const targetUid = isPolymorphicRelation ? relation.__type : attribute.target;

        addDocId(targetUid, relation);

        // Handle positional arguments
        const position = relation.position;

        // The positional relation target uid can be different for polymorphic relations
        let positionTargetUid = targetUid;
        if (isPolymorphicRelation && position?.__type) {
          positionTargetUid = position.__type;
        }

        if (position?.before) {
          addDocId(positionTargetUid, { ...relation, ...position, documentId: position.before });
        }

        if (position?.after) {
          addDocId(positionTargetUid, { ...relation, ...position, documentId: position.after });
        }

        return relation;
      }, value as any);
    },
    { schema: strapi.getModel(source.uid), getModel: strapi.getModel.bind(strapi) },
    data
  );
};

export { extractDataIds };
