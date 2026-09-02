import { snakeCase } from 'lodash/fp';

import type { Core } from '@strapi/types';

export interface RenameNames {
  oldName: string;
  newName: string;
}

export interface ComponentRenameUids {
  oldUid: string;
  newUid: string;
}

export interface UnsupportedRename {
  uid: string;
  oldName: string;
  newName: string;
  reason: 'model-not-found' | 'attribute-not-found' | 'unsupported-type';
}

/**
 * Physical column that stores a component's uid in every `*_cmps` link table
 * (both plain component attributes and dynamic zones write it). It is generated
 * with `compressible: false`, so it is never hashed/shortened — see
 * `getComponentTypeColumn` in core's `transform-content-types-to-models`.
 */
const COMPONENT_TYPE_COLUMN = 'component_type';

export interface BuiltMigration {
  filename: string;
  content: string;
}

/**
 * How a renamed attribute maps to a physical database artifact, resolved from
 * `strapi.db.metadata` (the live, pre-rename schema). The `from` field is the
 * current physical identifier and moves forward at each hop so rename chains and
 * user-routed swaps replay verbatim.
 *
 * - `scalarColumn` / `joinColumn`: a column on the model's own table. Scalar
 *   columns resolve names via `getColumnName`; relation join columns (`<field>_id`)
 *   via `getJoinColumnAttributeIdName`.
 * - `joinTable`: a relation backed by a join/link table (the table name encodes
 *   the owning attribute name).
 * - `component`: a component or dynamic zone — the attribute name is a *value* in
 *   the per-type link table's `field` column, so it is an `UPDATE`, not DDL.
 * - `media`: like `component`, but stored in the shared `files_related_morphs`
 *   table, so the `UPDATE` is additionally scoped by `related_type` (the uid).
 * - `skip`: recognised but needs no DB change (e.g. the inverse side of a
 *   bidirectional relation — the join table is named from the owning side).
 * - `unsupported`: cannot be migrated automatically (polymorphic morph relations,
 *   which are not creatable through the CTB UI anyway).
 */
type Resolved =
  | { kind: 'scalarColumn'; table: string; from: string }
  | { kind: 'joinColumn'; table: string; from: string }
  | { kind: 'joinTable'; from: string }
  | { kind: 'component'; table: string; fieldColumn: string; from: string }
  | {
      kind: 'media';
      table: string;
      fieldColumn: string;
      typeColumn: string;
      typeValue: string;
      from: string;
    }
  | { kind: 'skip' }
  | { kind: 'unsupported'; reason: UnsupportedRename['reason'] };

interface MigrationBuilderDeps {
  strapi: Core.Strapi;
}

interface MigrationFileBuilder {
  renameColumn(op: { table: string; from: string; to: string; comment?: string }): void;
  renameTable(op: { from: string; to: string; comment?: string }): void;
  updateRows(op: {
    table: string;
    guardColumn?: string;
    where: Record<string, string>;
    set: Record<string, string>;
    comment?: string;
  }): void;
  hasChanges(): boolean;
  build(options: { name: string }): BuiltMigration | null;
  writeFiles(options: { name: string }): Promise<string | null>;
}

interface MigrationProviderWithFileBuilder {
  createFileBuilder(): MigrationFileBuilder;
}

export const createMigrationBuilder = ({ strapi }: MigrationBuilderDeps) => {
  const { db } = strapi;

  const migrationFileBuilder = (
    db.migrations as typeof db.migrations & MigrationProviderWithFileBuilder
  ).createFileBuilder();
  const unsupported: UnsupportedRename[] = [];

  const { identifiers } = db.metadata;

  // Artifacts "in flight" for the current save, i.e. produced by an earlier
  // rename hop in this same batch (e.g. the intermediate `tmp` field a user
  // routes a swap through). Keyed per uid by the *logical* field name the hop
  // produced; the value records how that field resolves to a physical artifact
  // and its current `from` identifier, so a continuation hop replays from the
  // right place instead of being treated as a brand-new, unknown attribute.
  const inFlight = new Map<string, Map<string, Resolved>>();

  // Component-level renames (uid changes) discovered for the current save. Keyed
  // by the *current* component uid, the value is the set of `*_cmps` link tables
  // that hold a `component_type` referencing it. Tracking this lets a continuation
  // hop (`b -> c` after `a -> b`) reuse the tables resolved for the original uid
  // instead of re-scanning the schema (which no longer knows the intermediate uid).
  const componentInFlight = new Map<string, string[]>();

  const markInFlight = (uid: string, name: string, resolved: Resolved): void => {
    let entries = inFlight.get(uid);
    if (!entries) {
      entries = new Map<string, Resolved>();
      inFlight.set(uid, entries);
    }
    entries.set(name, resolved);
  };

  const resolveColumn = (name: string): string => identifiers.getColumnName(snakeCase(name));

  const isMorphRelation = (attribute: any): boolean =>
    typeof attribute?.relation === 'string' && attribute.relation.startsWith('morph');

  const schemaTypeOf = (uid: string, name: string): string | undefined => {
    const contentTypes = strapi.contentTypes as Record<string, any> | undefined;
    const components = strapi.components as Record<string, any> | undefined;
    const model = contentTypes?.[uid] ?? components?.[uid];
    return model?.attributes?.[name]?.type as string | undefined;
  };

  // Resolves the shared upload morph table (e.g. `files_related_morphs`) and its
  // `related_type` column from the file model's `related` morph attribute. This
  // is the single table every media field across all types writes to, keyed by
  // (`field` = attribute name, `related_type` = owning uid).
  const resolveUploadMorphTable = ():
    | { table: string; fieldColumn: string; typeColumn: string }
    | undefined => {
    if (!db.metadata.has('plugin::upload.file')) {
      return undefined;
    }
    const fileMeta = db.metadata.get('plugin::upload.file');
    const related = (fileMeta.attributes as Record<string, any>)?.related;
    const joinTable = related?.joinTable;
    const morphColumn = joinTable?.morphColumn ?? related?.morphColumn;
    if (!joinTable?.name || !morphColumn?.typeColumn?.name) {
      return undefined;
    }
    return {
      table: joinTable.name,
      fieldColumn: identifiers.FIELD_COLUMN,
      typeColumn: morphColumn.typeColumn.name,
    };
  };

  /**
   * Classifies the *first* hop of a rename by inspecting the live metadata, which
   * still reflects the pre-rename schema. Continuation hops never reach here —
   * they inherit their classification from the in-flight map.
   */
  const classify = (uid: string, oldName: string): Resolved => {
    const meta = db.metadata.get(uid);
    const attribute = meta.attributes?.[oldName] as any;

    if (!attribute) {
      return { kind: 'unsupported', reason: 'attribute-not-found' };
    }

    const joinTable = attribute.joinTable;
    const upload = resolveUploadMorphTable();

    // Media: the attribute name is a value in the shared `files_related_morphs`
    // `field` column, scoped by `related_type` (the owning uid). Detect it by
    // schema type OR by the join table being the shared upload table — the
    // latter guard is critical so a media field can never fall through to the
    // unscoped component branch and corrupt other types' media on the shared
    // table.
    const isMedia =
      schemaTypeOf(uid, oldName) === 'media' || (!!upload && joinTable?.name === upload.table);
    if (isMedia) {
      if (upload) {
        return {
          kind: 'media',
          table: upload.table,
          fieldColumn: upload.fieldColumn,
          typeColumn: upload.typeColumn,
          typeValue: uid,
          from: oldName,
        };
      }
      return { kind: 'unsupported', reason: 'unsupported-type' };
    }

    // Components & dynamic zones: the attribute name is a value in the per-type
    // link table's `field` column.
    if (joinTable?.on && typeof joinTable.on === 'object') {
      const fieldColumn = Object.keys(joinTable.on).find((key) => joinTable.on[key] === oldName);
      if (fieldColumn) {
        return { kind: 'component', table: joinTable.name, fieldColumn, from: oldName };
      }
    }

    if (attribute.type === 'relation') {
      // Polymorphic morph relations need shared-table handling and are not
      // creatable through the CTB UI, so they are left unsupported.
      if (isMorphRelation(attribute) || attribute.morphColumn) {
        return { kind: 'unsupported', reason: 'unsupported-type' };
      }

      // Join column on the owner's own table (`<field>_id`), e.g. useJoinTable:false.
      if (attribute.joinColumn?.name && !joinTable) {
        return { kind: 'joinColumn', table: meta.tableName, from: attribute.joinColumn.name };
      }

      if (joinTable?.name) {
        // The inverse side of a bidirectional relation: the join table is named
        // from the owning attribute, so renaming this side touches no artifact.
        if (attribute.mappedBy) {
          return { kind: 'skip' };
        }
        return { kind: 'joinTable', from: joinTable.name };
      }

      return { kind: 'unsupported', reason: 'unsupported-type' };
    }

    // Plain scalar column on the model's own table.
    if (attribute.columnName) {
      return { kind: 'scalarColumn', table: meta.tableName, from: attribute.columnName };
    }

    return { kind: 'unsupported', reason: 'unsupported-type' };
  };

  /**
   * Computes the destination identifier for a resolved artifact given the new
   * field name, and the next in-flight state (with `from` advanced to `to`).
   */
  const advance = (uid: string, resolved: Resolved, oldName: string, newName: string): Resolved => {
    const meta = db.metadata.get(uid);
    const comment = `${uid}: rename field "${oldName}" -> "${newName}"`;

    switch (resolved.kind) {
      case 'scalarColumn':
      case 'joinColumn': {
        const to =
          resolved.kind === 'joinColumn'
            ? identifiers.getJoinColumnAttributeIdName(snakeCase(newName))
            : resolveColumn(newName);
        if (resolved.from !== to) {
          migrationFileBuilder.renameColumn({
            table: resolved.table,
            from: resolved.from,
            to,
            comment,
          });
        }
        return { ...resolved, from: to };
      }
      case 'joinTable': {
        const to = identifiers.getJoinTableName(snakeCase(meta.tableName), snakeCase(newName));
        if (resolved.from !== to) {
          migrationFileBuilder.renameTable({ from: resolved.from, to, comment });
        }
        return { ...resolved, from: to };
      }
      case 'component': {
        const to = newName;
        if (resolved.from !== to) {
          migrationFileBuilder.updateRows({
            table: resolved.table,
            guardColumn: resolved.fieldColumn,
            where: { [resolved.fieldColumn]: resolved.from },
            set: { [resolved.fieldColumn]: to },
            comment,
          });
        }
        return { ...resolved, from: to };
      }
      case 'media': {
        const to = newName;
        if (resolved.from !== to) {
          migrationFileBuilder.updateRows({
            table: resolved.table,
            guardColumn: resolved.fieldColumn,
            where: {
              [resolved.fieldColumn]: resolved.from,
              [resolved.typeColumn]: resolved.typeValue,
            },
            set: { [resolved.fieldColumn]: to },
            comment,
          });
        }
        return { ...resolved, from: to };
      }
      default:
        return resolved;
    }
  };

  /**
   * Records one rename hop exactly in the order the user performed it. Because the
   * Content-Type Builder forbids two fields sharing a name at any instant, the
   * recorded path is inherently collision-free: replaying each hop verbatim never
   * targets an occupied artifact, so no synthetic temporary name is ever needed
   * (a "swap" is already expressed by the user's own intermediate-name hop).
   */
  const addRename = (uid: string, { oldName, newName }: RenameNames): void => {
    // `metadata.get` throws when the model is unknown, so guard with `has` first.
    if (!db.metadata.has(uid)) {
      unsupported.push({ uid, oldName, newName, reason: 'model-not-found' });
      return;
    }

    const entries = inFlight.get(uid);
    const resolved = entries?.get(oldName) ?? classify(uid, oldName);
    entries?.delete(oldName);

    if (resolved.kind === 'unsupported') {
      unsupported.push({ uid, oldName, newName, reason: resolved.reason });
      // Keep the chain consistent so a later continuation hop stays silent.
      markInFlight(uid, newName, resolved);
      return;
    }

    if (resolved.kind === 'skip') {
      markInFlight(uid, newName, resolved);
      return;
    }

    const next = advance(uid, resolved, oldName, newName);
    markInFlight(uid, newName, next);
  };

  /**
   * Finds every `*_cmps` link table that stores a `component_type` referencing
   * `componentUid`, by scanning the pre-reload schema for content-types and
   * components that use it (as a `component` attribute or inside a `dynamiczone`)
   * and resolving each owner's physical link table from `strapi.db.metadata`.
   */
  const resolveComponentCmpsTables = (componentUid: string): string[] => {
    const tables = new Set<string>();

    const scanOwner = (ownerUid: string, model: any): void => {
      const attributes = model?.attributes as Record<string, any> | undefined;
      if (!attributes) {
        return;
      }

      let meta: any;
      for (const [attributeName, attribute] of Object.entries(attributes)) {
        const references =
          (attribute?.type === 'component' && attribute.component === componentUid) ||
          (attribute?.type === 'dynamiczone' &&
            Array.isArray(attribute.components) &&
            attribute.components.includes(componentUid));

        if (!references) {
          continue;
        }

        if (!meta) {
          if (!db.metadata.has(ownerUid)) {
            continue;
          }
          meta = db.metadata.get(ownerUid);
        }

        const table = meta.attributes?.[attributeName]?.joinTable?.name;
        if (table) {
          tables.add(table);
        }
      }
    };

    const contentTypes = strapi.contentTypes as Record<string, any> | undefined;
    const components = strapi.components as Record<string, any> | undefined;
    Object.entries(contentTypes ?? {}).forEach(([uid, model]) => scanOwner(uid, model));
    Object.entries(components ?? {}).forEach(([uid, model]) => scanOwner(uid, model));

    return [...tables];
  };

  /**
   * Records a component-level rename (its uid changed, e.g. the user moved it to
   * a new category). The component's own data table keeps its `collectionName`
   * (the CTB does not rename it), so the only data to preserve is the
   * `component_type` reference in every link table that points at the old uid.
   */
  const addRenameComponentUid = (oldUid: string, newUid: string): void => {
    if (oldUid === newUid) {
      return;
    }

    const known = componentInFlight.get(oldUid);
    if (!known && !db.metadata.has(oldUid)) {
      unsupported.push({
        uid: oldUid,
        oldName: oldUid,
        newName: newUid,
        reason: 'model-not-found',
      });
      return;
    }

    const tables = known ?? resolveComponentCmpsTables(oldUid);

    for (const table of tables) {
      migrationFileBuilder.updateRows({
        table,
        guardColumn: COMPONENT_TYPE_COLUMN,
        where: { [COMPONENT_TYPE_COLUMN]: oldUid },
        set: { [COMPONENT_TYPE_COLUMN]: newUid },
        comment: `rename component "${oldUid}" -> "${newUid}" in ${table}`,
      });
    }

    componentInFlight.delete(oldUid);
    componentInFlight.set(newUid, tables);
  };

  return {
    addRenameAttribute(uid: string, names: RenameNames): void {
      addRename(uid, names);
    },

    addRenameComponent({ oldUid, newUid }: ComponentRenameUids): void {
      addRenameComponentUid(oldUid, newUid);
    },

    hasChanges(): boolean {
      return migrationFileBuilder.hasChanges();
    },

    getUnsupported(): UnsupportedRename[] {
      return [...unsupported];
    },

    build(): BuiltMigration | null {
      return migrationFileBuilder.build({ name: 'rename-fields' });
    },

    async writeFiles(): Promise<string | null> {
      return migrationFileBuilder.writeFiles({ name: 'rename-fields' });
    },
  };
};

export type MigrationBuilder = ReturnType<typeof createMigrationBuilder>;
