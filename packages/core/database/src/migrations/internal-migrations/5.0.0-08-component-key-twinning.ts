/**
 * Best-effort twinning of `component_key` across draft/published component pairs.
 *
 * After `5.0.0-07-component-key`, each existing component row has its own unique key.
 * Draft and published rows that represent the same logical block only share a key after
 * the next publish. This migration aligns them without requiring a re-publish by matching
 * join-table links on the same document (document_id + locale) by field + order + type.
 *
 * Nested components are twinned recursively when both sides link the same nested field.
 *
 * @see docs/docs/rfcs/03-component-key.md
 */
import type { Knex } from 'knex';

import type { Migration } from '../common';
import type { Database } from '../..';
import type { Meta } from '../../metadata';
import type { JoinTable, MorphJoinTable, RelationalAttribute } from '../../types';

const COMPONENT_KEY_COLUMN = 'component_key';

type EntityPair = {
  documentId: string;
  locale: string | null;
  draftId: number | string;
  publishedId: number | string;
};

type LinkRow = {
  entity_id: number | string;
  component_id: number | string;
  field: string;
  order: number | null;
  component_type: string | null;
};

const hasJoinTable = (
  attribute: RelationalAttribute
): attribute is RelationalAttribute & { joinTable: JoinTable | MorphJoinTable } => {
  return Boolean(attribute && 'joinTable' in attribute && attribute.joinTable);
};

const isComponentLikeJoin = (joinTable: JoinTable | MorphJoinTable): boolean => {
  // Component / DZ joins always scope rows with an `on.field` pivot value
  return Boolean(joinTable.on && typeof (joinTable.on as { field?: unknown }).field === 'string');
};

const getEntityIdColumn = (joinTable: JoinTable | MorphJoinTable): string =>
  joinTable.joinColumn.name;

const getComponentIdColumn = (joinTable: JoinTable | MorphJoinTable): string => {
  if ('morphColumn' in joinTable && joinTable.morphColumn?.idColumn?.name) {
    return joinTable.morphColumn.idColumn.name;
  }
  return (joinTable as JoinTable).inverseJoinColumn.name;
};

const getComponentTypeColumn = (joinTable: JoinTable | MorphJoinTable): string | null => {
  if ('morphColumn' in joinTable && joinTable.morphColumn?.typeColumn?.name) {
    return joinTable.morphColumn.typeColumn.name;
  }
  // Regular component joins still store component_type in pivotColumns
  const typeCol = joinTable.pivotColumns.find((col) => col.includes('component_type'));
  return typeCol ?? null;
};

const getOrderColumn = (joinTable: JoinTable | MorphJoinTable): string | null => {
  if ('orderColumnName' in joinTable && typeof joinTable.orderColumnName === 'string') {
    return joinTable.orderColumnName;
  }
  if (joinTable.pivotColumns.includes('order')) {
    return 'order';
  }
  // Dynamic zones set orderBy.order without orderColumnName / order in pivotColumns
  if (joinTable.orderBy && typeof joinTable.orderBy === 'object' && 'order' in joinTable.orderBy) {
    return 'order';
  }
  return null;
};

const getFieldColumn = (joinTable: JoinTable | MorphJoinTable): string => {
  if (joinTable.pivotColumns.includes('field')) {
    return 'field';
  }
  // Fall back to first non-id pivot that isn't entity/component/type/order
  return 'field';
};

const findDraftPublishedPairs = async (
  knex: Knex,
  tableName: string,
  hasLocale: boolean
): Promise<EntityPair[]> => {
  const draftQuery = knex(tableName)
    .select('id', 'document_id', ...(hasLocale ? ['locale'] : []))
    .whereNull('published_at');

  const publishedQuery = knex(tableName)
    .select('id', 'document_id', ...(hasLocale ? ['locale'] : []))
    .whereNotNull('published_at');

  const drafts: Array<{ id: number | string; document_id: string; locale?: string | null }> =
    await draftQuery;
  const published: Array<{ id: number | string; document_id: string; locale?: string | null }> =
    await publishedQuery;

  const publishedIndex = new Map<string, { id: number | string; locale: string | null }[]>();
  for (const row of published) {
    const key = row.document_id;
    const list = publishedIndex.get(key) ?? [];
    list.push({ id: row.id, locale: hasLocale ? (row.locale ?? null) : null });
    publishedIndex.set(key, list);
  }

  const pairs: EntityPair[] = [];
  for (const draft of drafts) {
    const candidates = publishedIndex.get(draft.document_id) ?? [];
    const draftLocale = hasLocale ? (draft.locale ?? null) : null;
    const match = candidates.find((candidate) =>
      hasLocale ? candidate.locale === draftLocale : true
    );
    if (!match) {
      continue;
    }
    pairs.push({
      documentId: draft.document_id,
      locale: draftLocale,
      draftId: draft.id,
      publishedId: match.id,
    });
  }

  return pairs;
};

const loadLinks = async (
  knex: Knex,
  joinTable: JoinTable | MorphJoinTable,
  entityId: number | string
): Promise<LinkRow[]> => {
  const entityCol = getEntityIdColumn(joinTable);
  const componentCol = getComponentIdColumn(joinTable);
  const fieldCol = getFieldColumn(joinTable);
  const orderCol = getOrderColumn(joinTable);
  const typeCol = getComponentTypeColumn(joinTable);

  const hasTable = await knex.schema.hasTable(joinTable.name);
  if (!hasTable) {
    return [];
  }

  const query = knex(joinTable.name)
    .select({
      entity_id: entityCol,
      component_id: componentCol,
      field: fieldCol,
      order: orderCol || knex.raw('NULL'),
      component_type: typeCol || knex.raw('NULL'),
    })
    .where(entityCol, entityId);

  // Component / DZ joins share one physical table; scope to this attribute's field
  if (joinTable.on) {
    query.where(joinTable.on);
  }

  if (orderCol) {
    query.orderBy([
      { column: fieldCol, order: 'asc' },
      { column: orderCol, order: 'asc' },
    ]);
  } else {
    query.orderBy(fieldCol, 'asc');
  }

  return query;
};

const linkMatchKey = (link: LinkRow): string => {
  const order = link.order == null ? '0' : String(link.order);
  const type = link.component_type ?? '';
  return `${link.field}::${order}::${type}`;
};

const copyComponentKey = async (
  knex: Knex,
  componentTable: string,
  draftComponentId: number | string,
  publishedComponentId: number | string
): Promise<boolean> => {
  const hasColumn = await knex.schema.hasColumn(componentTable, COMPONENT_KEY_COLUMN);
  if (!hasColumn) {
    return false;
  }

  if (draftComponentId === publishedComponentId) {
    return false;
  }

  const draft = await knex(componentTable)
    .select(COMPONENT_KEY_COLUMN)
    .where({ id: draftComponentId })
    .first();

  const draftKey = draft?.[COMPONENT_KEY_COLUMN];
  if (!draftKey) {
    return false;
  }

  const published = await knex(componentTable)
    .select(COMPONENT_KEY_COLUMN)
    .where({ id: publishedComponentId })
    .first();

  if (published?.[COMPONENT_KEY_COLUMN] === draftKey) {
    return true;
  }

  await knex(componentTable)
    .where({ id: publishedComponentId })
    .update({ [COMPONENT_KEY_COLUMN]: draftKey });

  return true;
};

const twinNestedComponents = async (
  knex: Knex,
  db: Database,
  componentUID: string,
  draftComponentId: number | string,
  publishedComponentId: number | string,
  seen: Set<string>
) => {
  const visitKey = `${componentUID}:${draftComponentId}:${publishedComponentId}`;
  if (seen.has(visitKey)) {
    return;
  }
  seen.add(visitKey);

  const meta = db.metadata.get(componentUID);
  if (!meta) {
    return;
  }

  for (const attribute of Object.values(meta.attributes)) {
    if (attribute.type !== 'relation' || !hasJoinTable(attribute as RelationalAttribute)) {
      continue;
    }

    const joinTable = (
      attribute as RelationalAttribute & {
        joinTable: JoinTable | MorphJoinTable;
      }
    ).joinTable;

    if (!isComponentLikeJoin(joinTable)) {
      continue;
    }

    const draftLinks = await loadLinks(knex, joinTable, draftComponentId);
    const publishedLinks = await loadLinks(knex, joinTable, publishedComponentId);
    const publishedByKey = new Map(publishedLinks.map((link) => [linkMatchKey(link), link]));

    for (const draftLink of draftLinks) {
      const publishedLink = publishedByKey.get(linkMatchKey(draftLink));
      if (!publishedLink) {
        continue;
      }

      const nestedUID =
        draftLink.component_type ??
        ('target' in attribute ? (attribute as { target?: string }).target : undefined);

      if (!nestedUID) {
        continue;
      }

      const nestedMeta = db.metadata.get(nestedUID);
      if (!nestedMeta?.attributes?.componentKey) {
        continue;
      }

      await copyComponentKey(
        knex,
        nestedMeta.tableName,
        draftLink.component_id,
        publishedLink.component_id
      );

      await twinNestedComponents(
        knex,
        db,
        nestedUID,
        draftLink.component_id,
        publishedLink.component_id,
        seen
      );
    }
  }
};

const twinContentType = async (knex: Knex, db: Database, meta: Meta) => {
  const hasPublishedAt = Boolean(meta.attributes?.publishedAt);
  const hasDocumentId = Boolean(meta.attributes?.documentId);
  if (!hasPublishedAt || !hasDocumentId) {
    return;
  }

  const hasTable = await knex.schema.hasTable(meta.tableName);
  if (!hasTable) {
    return;
  }

  const hasLocale = Boolean(meta.attributes?.locale);
  const pairs = await findDraftPublishedPairs(knex, meta.tableName, hasLocale);
  if (pairs.length === 0) {
    return;
  }

  const seen = new Set<string>();

  for (const attribute of Object.values(meta.attributes)) {
    if (attribute.type !== 'relation' || !hasJoinTable(attribute as RelationalAttribute)) {
      continue;
    }

    const relationAttribute = attribute as RelationalAttribute & {
      joinTable: JoinTable | MorphJoinTable;
      target?: string;
    };
    const { joinTable } = relationAttribute;

    if (!isComponentLikeJoin(joinTable)) {
      continue;
    }

    for (const pair of pairs) {
      const draftLinks = await loadLinks(knex, joinTable, pair.draftId);
      const publishedLinks = await loadLinks(knex, joinTable, pair.publishedId);
      const publishedByKey = new Map(publishedLinks.map((link) => [linkMatchKey(link), link]));

      for (const draftLink of draftLinks) {
        const publishedLink = publishedByKey.get(linkMatchKey(draftLink));
        if (!publishedLink) {
          continue;
        }

        const componentUID = draftLink.component_type ?? relationAttribute.target;
        if (!componentUID) {
          continue;
        }

        const componentMeta = db.metadata.get(componentUID);
        if (!componentMeta?.attributes?.componentKey) {
          continue;
        }

        await copyComponentKey(
          knex,
          componentMeta.tableName,
          draftLink.component_id,
          publishedLink.component_id
        );

        await twinNestedComponents(
          knex,
          db,
          componentUID,
          draftLink.component_id,
          publishedLink.component_id,
          seen
        );
      }
    }
  }
};

export const twinComponentKeys = async (knex: Knex, db: Database) => {
  for (const meta of db.metadata.values()) {
    // Content types only (components are visited via parent join links)
    if (!meta.attributes?.documentId || !meta.attributes?.publishedAt) {
      continue;
    }

    await twinContentType(knex, db, meta);
  }
};

export const twinComponentKeysMigration: Migration = {
  name: '5.0.0-08-component-key-twinning',
  async up(knex, db) {
    await twinComponentKeys(knex, db);
  },
  async down() {
    // Twinning is additive alignment; cannot safely restore prior divergent keys
  },
};
