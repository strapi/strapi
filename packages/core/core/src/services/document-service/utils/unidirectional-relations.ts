/* eslint-disable no-continue */
import { UID, Schema } from '@strapi/types';
import { async, traverseEntity } from '@strapi/utils';

interface RelationToSync {
  uid: string;
  attribute: string;
}

/**
 * Updates uni directional relations to target the right entries when overriding published or draft entries.
 *
 * 1. Finds all content types that target the content type that's about to be published/discarded
 * 2. For each relation, update them to target the new entry
 *
 * @param oldEntries - The old entries that will be removed.
 * @param newEntries - The new entries that unidirectional relations should target.
 */
const syncUnidirectionalRelations = async (
  uid: UID.ContentType,
  oldEntries: { id: string; locale: string }[],
  newEntries: { id: string; locale: string }[]
) => {
  const relationsToSync: RelationToSync[] = [];

  // Iterate all components and content types
  const contentTypes = Object.values(strapi.contentTypes) as Schema.ContentType[];
  const components = Object.values(strapi.components) as Schema.Component[];

  for (const contentType of [...contentTypes, ...components]) {
    // If the content type has a relation to the current content type
    for (const [name, attribute] of Object.entries(contentType.attributes) as any) {
      if (attribute.type !== 'relation') continue;
      if (attribute.target !== uid) continue;
      // If its inversed by or mapped by, ignore
      if (attribute.inversedBy || attribute.mappedBy) continue;

      relationsToSync.push({ uid: contentType.uid, attribute: name });
    }
  }

  await strapi.db.transaction(async ({ trx }) =>
    async.map(newEntries, async (newEntry: { id: string; locale: string }) => {
      // Entries should match by locale
      const oldEntry = oldEntries.find((entry) => entry.locale === newEntry.locale);
      if (!oldEntry) return;

      // Update all relations to the new entry
      for (const { uid, attribute: name } of relationsToSync) {
        const model = strapi.db.metadata.get(uid);
        const attribute = model.attributes[name];
        if (attribute?.type === 'relation') {
          // @ts-expect-error - FIX
          const joinTable = attribute.joinTable;
          if (!joinTable) continue;
          const { name } = joinTable.inverseJoinColumn;

          await strapi.db
            .getConnection()
            .from(joinTable.name)
            .where(name, oldEntry.id)
            .update(name, newEntry.id)
            .transacting(trx);
        }
      }
    })
  );
};

export { syncUnidirectionalRelations };
