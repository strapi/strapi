import type { Database } from '@strapi/database';
import type { Schema } from '@strapi/types';
import { findComponentParent, getParentSchemasForComponent } from '../components';

/**
 * Cleans ghost relations with publication state mismatches from a join table.
 *
 * "Ghost" relations are duplicated join rows where, for a single source instance,
 * relations exist to both the draft and the published version of the same target
 * document. Only one of those relations is legitimate: the one whose publication
 * state matches the source's own publication state. The other is a leftover
 * from a past write-path bug and must be removed.
 *
 * Which side is the ghost is therefore not fixed — it depends on the source:
 *   - A draft source (or a component instance whose owning entry is a draft)
 *     should keep the relation pointing to the draft target; the
 *     published-target row is the ghost.
 *   - A published source (or a component instance whose owning entry is
 *     published) should keep the relation pointing to the published target;
 *     the draft-target row is the ghost.
 *
 * If the source's effective publication state cannot be determined (for
 * example, an orphan component instance with no parent), the row is left
 * untouched to avoid further data loss.
 */
export const cleanComponentJoinTable = async (
  db: Database,
  joinTableName: string,
  relation: any,
  sourceModel: any
): Promise<number> => {
  try {
    // Get the target model metadata
    const targetModel = db.metadata.get(relation.target);
    if (!targetModel) {
      db.logger.debug(`Target model ${relation.target} not found, skipping ${joinTableName}`);
      return 0;
    }

    // Check if source supports draft/publish, if it doesnt it should contain duplicate states
    const sourceContentType = strapi.contentTypes[sourceModel.uid];
    // It could be a model, which does not have the draftAndPublish option
    const sourceSupportsDraftPublish = sourceContentType?.options?.draftAndPublish;

    if (sourceContentType && !sourceSupportsDraftPublish) {
      return 0;
    }

    // Check if target supports draft/publish using schema-based approach (like prevention fix)
    const targetContentType =
      strapi.contentTypes[relation.target as keyof typeof strapi.contentTypes];
    const targetSupportsDraftPublish = targetContentType?.options?.draftAndPublish || false;

    if (!targetSupportsDraftPublish) {
      return 0;
    }

    // Find entries with publication state mismatches
    const ghostEntries = await findPublicationStateMismatches(
      db,
      joinTableName,
      relation,
      targetModel,
      sourceModel
    );

    if (ghostEntries.length === 0) {
      return 0;
    }

    // Remove ghost entries
    await db.connection(joinTableName).whereIn('id', ghostEntries).del();
    db.logger.debug(
      `Removed ${ghostEntries.length} ghost relations with publication state mismatches from ${joinTableName}`
    );

    return ghostEntries.length;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    db.logger.error(`Failed to clean join table "${joinTableName}": ${errorMessage}`);
    return 0;
  }
};

/**
 * Walks up the component containment chain for a component instance until it
 * reaches the owning content-type entry. Returns the content-type uid, table
 * name and id of that entry, or null if the chain breaks (orphan component).
 */
const findContentTypeParentForComponentInstance = async (
  componentSchema: Schema.Component,
  componentId: number | string
): Promise<{ uid: string; table: string; parentId: number | string } | null> => {
  // Get the parent schemas that could contain this component
  const parentSchemas = getParentSchemasForComponent(componentSchema);
  if (parentSchemas.length === 0) {
    // No potential parents
    return null;
  }

  // Find the actual parent for THIS specific component instance
  const parent = await findComponentParent(componentSchema, componentId, parentSchemas);
  if (!parent) {
    // No parent found for this component instance
    return null;
  }

  if (strapi.components[parent.uid as keyof typeof strapi.components]) {
    // If the parent is a component, we need to check its parents recursively
    const parentComponentSchema = strapi.components[parent.uid as keyof typeof strapi.components];
    return findContentTypeParentForComponentInstance(parentComponentSchema, parent.parentId);
  }

  if (strapi.contentTypes[parent.uid as keyof typeof strapi.contentTypes]) {
    // Found a content type parent
    return parent;
  }

  return null;
};

/**
 * Returns the effective publication state of a join-row's source:
 *   - 'published' if the source row (or its owning content-type entry for
 *     a component source) has `published_at IS NOT NULL`
 *   - 'draft' if `published_at IS NULL`
 *   - null if the state can't be determined (e.g., orphan component, or the
 *     owning content type doesn't support D&P — in which case the source
 *     keeps both states and we must not touch it)
 */
const resolveSourcePublicationState = async (
  db: Database,
  sourceModel: any,
  sourceId: number | string
): Promise<'draft' | 'published' | null> => {
  const isComponentModel =
    !sourceModel.uid?.startsWith('api::') &&
    !sourceModel.uid?.startsWith('plugin::') &&
    sourceModel.uid?.includes('.');

  // Component source: walk up the component chain to the owning content-type entry
  if (isComponentModel) {
    const componentSchema = strapi.components[sourceModel.uid as keyof typeof strapi.components] as
      | Schema.Component
      | undefined;
    if (!componentSchema) {
      return null;
    }

    const parent = await findContentTypeParentForComponentInstance(componentSchema, sourceId);
    if (!parent) {
      return null;
    }

    const parentContentType = strapi.contentTypes[parent.uid as keyof typeof strapi.contentTypes];

    // If the owning content type doesn't support D&P its entries hold both
    // states inline; touching the join rows could destroy legitimate links.
    if (!parentContentType?.options?.draftAndPublish) {
      return null;
    }

    const parentRow = await db
      .connection(parent.table)
      .select('published_at')
      .where('id', parent.parentId)
      .first();

    if (!parentRow) {
      return null;
    }
    return parentRow.published_at === null ? 'draft' : 'published';
  }

  // Non-component source: read publication state directly from the source row
  const sourceRow = await db
    .connection(sourceModel.tableName)
    .select('published_at')
    .where('id', sourceId)
    .first();

  if (!sourceRow) {
    return null;
  }
  return sourceRow.published_at === null ? 'draft' : 'published';
};

/**
 * Finds join table entries with publication state mismatches.
 *
 * For every (source_id, target_document_id) pair where both a draft-target row
 * and a published-target row exist, exactly one of them is a ghost. The one
 * to drop is the one whose target publication state does NOT match the
 * source's own publication state.
 */
const findPublicationStateMismatches = async (
  db: Database,
  joinTableName: string,
  relation: any,
  targetModel: any,
  sourceModel: any
): Promise<number[]> => {
  try {
    // Get join column names using proper functions (addressing PR feedback)
    const sourceColumn = relation.joinTable.joinColumn.name;
    const targetColumn = relation.joinTable.inverseJoinColumn.name;

    // Get all join entries with their target entities. We also fetch
    // `document_id` so we can group by target document and apply the mismatch
    // rule per-document rather than across the whole source.
    const joinEntries = await db
      .connection(joinTableName)
      .select(
        `${joinTableName}.id as join_id`,
        `${joinTableName}.${sourceColumn} as source_id`,
        `${joinTableName}.${targetColumn} as target_id`,
        `${targetModel.tableName}.published_at as target_published_at`,
        `${targetModel.tableName}.document_id as target_document_id`
      )
      .leftJoin(
        targetModel.tableName,
        `${joinTableName}.${targetColumn}`,
        `${targetModel.tableName}.id`
      );

    // Group by source_id to find duplicates pointing to draft/published versions of same entity
    const entriesBySource: { [key: string]: any[] } = {};
    for (const entry of joinEntries) {
      const sourceId = entry.source_id;
      if (!entriesBySource[sourceId]) {
        entriesBySource[sourceId] = [];
      }
      entriesBySource[sourceId].push(entry);
    }

    const ghostEntries: number[] = [];

    // Check for draft/publish inconsistencies
    for (const [sourceId, entries] of Object.entries(entriesBySource)) {
      // Skip entries with single relations
      if (entries.length <= 1) {
        // eslint-disable-next-line no-continue
        continue;
      }

      // Resolve the source's effective publication state. We need this to
      // know which side of the duplicate pair is the ghost: the row whose
      // target state disagrees with the source state.
      let sourceState: 'draft' | 'published' | null;
      try {
        sourceState = await resolveSourcePublicationState(db, sourceModel, sourceId);
      } catch (error) {
        // Skip on error — better to leave data alone than to delete the wrong row
        // eslint-disable-next-line no-continue
        continue;
      }

      if (sourceState === null) {
        // Unknown source state — skip to avoid destroying legitimate links
        // eslint-disable-next-line no-continue
        continue;
      }

      // Group this source's rows by target document. The mismatch rule
      // applies per-document: a single source may legitimately link to many
      // different documents, mixed-state across documents is fine; what is
      // never legitimate is the same source linking to BOTH versions of the
      // SAME document.
      const entriesByDocument: { [docId: string]: any[] } = {};
      for (const entry of entries) {
        const docId = String(entry.target_document_id ?? '');
        if (!docId) {
          // eslint-disable-next-line no-continue
          continue;
        }
        if (!entriesByDocument[docId]) {
          entriesByDocument[docId] = [];
        }
        entriesByDocument[docId].push(entry);
      }

      for (const documentEntries of Object.values(entriesByDocument)) {
        if (documentEntries.length <= 1) {
          // eslint-disable-next-line no-continue
          continue;
        }

        const draftRows = documentEntries.filter((e) => e.target_published_at === null);
        const publishedRows = documentEntries.filter((e) => e.target_published_at !== null);

        // Only act when both states are present for the same document
        if (draftRows.length === 0 || publishedRows.length === 0) {
          // eslint-disable-next-line no-continue
          continue;
        }

        // Delete the rows whose target state disagrees with the source state.
        // A draft source keeps draft-target rows; a published source keeps
        // published-target rows.
        const ghostRows = sourceState === 'draft' ? publishedRows : draftRows;
        for (const row of ghostRows) {
          ghostEntries.push(row.join_id);
        }
      }
    }

    return ghostEntries;
  } catch (error) {
    return [];
  }
};
