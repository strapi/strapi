import path from 'node:path';

import type { Core } from '@strapi/types';

/**
 * The CTB-level attribute definition of the *new* side of a rename hop (the
 * `properties` the admin sends for `newName`). Only the storage-relevant keys
 * are inspected; see `isCompatibleRename`.
 */
export interface RenameAttributeDefinition {
  type?: string;
  relation?: string;
  target?: string;
  component?: string;
  repeatable?: boolean;
  [key: string]: unknown;
}

export interface RenameNames {
  oldName: string;
  newName: string;
  /**
   * Definition of the attribute under its new name, when known. Used to refuse
   * hops that also change the attribute's storage (e.g. `string` -> `integer`,
   * or a relation retargeted): renaming the column and letting schema sync
   * alter its type in place can fail on Postgres/MySQL, whereas the legacy
   * drop-and-recreate path is always safe.
   */
  newAttribute?: RenameAttributeDefinition;
}

export type UnsupportedRenameReason =
  | 'model-not-found'
  | 'attribute-not-found'
  | 'unsupported-type'
  | 'type-changed'
  | 'target-occupied';

export interface UnsupportedRename {
  uid: string;
  oldName: string;
  newName: string;
  reason: UnsupportedRenameReason;
}

/**
 * Whether the storage of `oldAttribute` can host `newAttribute` after a plain
 * rename of its physical artifact. Anything else must go through the legacy
 * drop-and-recreate path, so the hop is reported as `type-changed`.
 */
export const isCompatibleRename = (
  oldAttribute: RenameAttributeDefinition | undefined,
  newAttribute: RenameAttributeDefinition | undefined
): boolean => {
  // Without both definitions there is nothing to compare; the metadata-based
  // classification is the only guard we have.
  if (!oldAttribute?.type || !newAttribute?.type) {
    return true;
  }

  if (oldAttribute.type !== newAttribute.type) {
    return false;
  }

  switch (newAttribute.type) {
    case 'relation':
      return (
        oldAttribute.relation === newAttribute.relation &&
        oldAttribute.target === newAttribute.target
      );
    case 'component':
      return (
        oldAttribute.component === newAttribute.component &&
        Boolean(oldAttribute.repeatable) === Boolean(newAttribute.repeatable)
      );
    default:
      return true;
  }
};

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

const MIGRATION_NAME = 'rename-fields';

export const createMigrationBuilder = ({ strapi }: MigrationBuilderDeps) => {
  const { db } = strapi;

  const migrationFileBuilder = db.migrations.createFileBuilder();
  const unsupported: UnsupportedRename[] = [];

  // Physical-name rules shared with the metadata loader, so the *new* side of a
  // rename is derived exactly as `db.metadata` will derive it after the reload.
  const { naming } = db.metadata;

  /**
   * The app's *source* migrations dir. Generated files always land here (see
   * `writeFiles`), and it is also the dir discovery reads from when
   * `useTypescriptMigrations` is off or no tsconfig `outDir` resolves.
   */
  const sourceMigrationsDir = () => path.join(strapi.dirs.app.root, 'database', 'migrations');

  let format: 'javascript' | 'typescript' | undefined;

  /**
   * Mirror the database's discovery decision (`Strapi.ts`): it reads from
   * `<outDir>/database/migrations` only when `useTypescriptMigrations` is on
   * *and* a tsconfig `outDir` resolves. In that case the source file must be
   * `.ts` so `tsc` carries it into `dist`. Otherwise discovery reads the source
   * dir and only loads `.js`, so a `.ts` file would never run.
   *
   * Memoised so the fallback warning is logged once per builder (both `build`
   * and `writeFiles` call this).
   */
  const getFormat = (): 'javascript' | 'typescript' => {
    if (format) {
      return format;
    }

    const useTSM = strapi.config.get('database.settings.useTypescriptMigrations') === true;
    const discoveryDir = db.config.settings.migrations?.dir;
    const discoversFromDist =
      typeof discoveryDir === 'string' &&
      path.resolve(discoveryDir) !== path.resolve(sourceMigrationsDir());

    if (useTSM && !discoversFromDist) {
      strapi.log.warn(
        'database.settings.useTypescriptMigrations is enabled but no TypeScript outDir was resolved for this app; ' +
          'writing the rename migration as JavaScript so it is discovered from database/migrations.'
      );
    }

    format = useTSM && discoversFromDist ? 'typescript' : 'javascript';
    return format;
  };

  // Artifacts "in flight" for the current save, i.e. produced by an earlier
  // rename hop in this same batch (e.g. the intermediate `tmp` field a user
  // routes a swap through). Keyed per uid by the *logical* field name the hop
  // produced; the value records how that field resolves to a physical artifact
  // and its current `from` identifier, so a continuation hop replays from the
  // right place instead of being treated as a brand-new, unknown attribute.
  const inFlight = new Map<string, Map<string, Resolved>>();

  // CTB-level definition of each in-flight field (per uid, by logical name), so
  // a continuation hop can still be checked for a storage change against the
  // definition the chain started from.
  const inFlightDefinitions = new Map<string, Map<string, RenameAttributeDefinition>>();

  // Logical names vacated by an earlier accepted hop of this batch (per uid). A
  // refused hop never vacates its source: the artifact stays live until schema
  // sync drops it. A hop may only target a name that is free: not live in the
  // pre-reload schema (unless an earlier accepted hop vacated it) and not
  // produced by an earlier hop still in flight. At migration time the schema-sync drop of a still-live field has
  // not happened yet, so renaming onto it would collide and the runtime guard
  // would silently skip the hop. Refusing it here surfaces the problem (e.g. a
  // truncated chain sent by a client) instead of losing data.
  const vacated = new Map<string, Set<string>>();

  const isTargetOccupied = (uid: string, newName: string): boolean => {
    if (inFlight.get(uid)?.has(newName)) {
      return true;
    }
    return Boolean(schemaAttributeOf(uid, newName)) && !(vacated.get(uid)?.has(newName) ?? false);
  };

  const trackVacated = (uid: string, oldName: string, newName: string): void => {
    let names = vacated.get(uid);
    if (!names) {
      names = new Set<string>();
      vacated.set(uid, names);
    }
    names.add(oldName);
    // The target is occupied again by the in-flight field.
    names.delete(newName);
  };

  const markInFlight = (uid: string, name: string, resolved: Resolved): void => {
    let entries = inFlight.get(uid);
    if (!entries) {
      entries = new Map<string, Resolved>();
      inFlight.set(uid, entries);
    }
    entries.set(name, resolved);
  };

  const isMorphRelation = (attribute: any): boolean =>
    typeof attribute?.relation === 'string' && attribute.relation.startsWith('morph');

  const schemaAttributeOf = (uid: string, name: string): RenameAttributeDefinition | undefined => {
    const contentTypes = strapi.contentTypes as Record<string, any> | undefined;
    const components = strapi.components as Record<string, any> | undefined;
    const model = contentTypes?.[uid] ?? components?.[uid];
    return model?.attributes?.[name] as RenameAttributeDefinition | undefined;
  };

  const schemaTypeOf = (uid: string, name: string): string | undefined =>
    schemaAttributeOf(uid, name)?.type;

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
      fieldColumn: db.metadata.identifiers.FIELD_COLUMN,
      typeColumn: morphColumn.typeColumn.name,
    };
  };

  /**
   * Classifies the *first* hop of a rename by inspecting the live metadata, which
   * still reflects the pre-rename schema. Continuation hops never reach here —
   * they inherit their classification from the in-flight map.
   */
  const classifyMedia = (
    uid: string,
    oldName: string,
    joinTable: any,
    upload: ReturnType<typeof resolveUploadMorphTable>
  ): Resolved | undefined => {
    // Media: the attribute name is a value in the shared `files_related_morphs`
    // `field` column, scoped by `related_type` (the owning uid). Detect it by
    // schema type OR by the join table being the shared upload table — the
    // latter guard is critical so a media field can never fall through to the
    // unscoped component branch and corrupt other types' media on the shared
    // table.
    const isMedia =
      schemaTypeOf(uid, oldName) === 'media' || (!!upload && joinTable?.name === upload.table);
    if (!isMedia) {
      return undefined;
    }
    if (!upload) {
      return { kind: 'unsupported', reason: 'unsupported-type' };
    }
    return {
      kind: 'media',
      table: upload.table,
      fieldColumn: upload.fieldColumn,
      typeColumn: upload.typeColumn,
      typeValue: uid,
      from: oldName,
    };
  };

  const classifyComponent = (oldName: string, joinTable: any): Resolved | undefined => {
    if (!joinTable?.on || typeof joinTable.on !== 'object') {
      return undefined;
    }
    const fieldColumn = Object.keys(joinTable.on).find((key) => joinTable.on[key] === oldName);
    if (!fieldColumn) {
      return undefined;
    }
    return { kind: 'component', table: joinTable.name, fieldColumn, from: oldName };
  };

  const classifyRelation = (meta: any, attribute: any, joinTable: any): Resolved => {
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
  };

  const classify = (uid: string, oldName: string): Resolved => {
    const meta = db.metadata.get(uid);
    const attribute = meta.attributes?.[oldName] as any;

    if (!attribute) {
      return { kind: 'unsupported', reason: 'attribute-not-found' };
    }

    const joinTable = attribute.joinTable;
    const upload = resolveUploadMorphTable();
    const media = classifyMedia(uid, oldName, joinTable, upload);
    if (media) {
      return media;
    }

    const component = classifyComponent(oldName, joinTable);
    if (component) {
      return component;
    }

    if (attribute.type === 'relation') {
      return classifyRelation(meta, attribute, joinTable);
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
            ? naming.joinColumnName(newName)
            : naming.columnName(newName);
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
        const to = naming.joinTableName(meta.tableName, newName);
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
  const addRename = (uid: string, { oldName, newName, newAttribute }: RenameNames): void => {
    // `metadata.get` throws when the model is unknown, so guard with `has` first.
    if (!db.metadata.has(uid)) {
      unsupported.push({ uid, oldName, newName, reason: 'model-not-found' });
      return;
    }

    if (isTargetOccupied(uid, newName)) {
      unsupported.push({ uid, oldName, newName, reason: 'target-occupied' });
      // Keep the chain consistent so a later continuation hop stays silent. The
      // source is not vacated: its artifact was not moved.
      markInFlight(uid, newName, { kind: 'unsupported', reason: 'target-occupied' });
      return;
    }

    const entries = inFlight.get(uid);
    const definitions = inFlightDefinitions.get(uid);
    const oldAttribute = definitions?.get(oldName) ?? schemaAttributeOf(uid, oldName);
    let resolved = entries?.get(oldName) ?? classify(uid, oldName);

    // A rename that also changes the attribute's storage cannot be expressed as a
    // rename of the physical artifact: leave it to the drop-and-recreate path.
    if (resolved.kind !== 'unsupported' && !isCompatibleRename(oldAttribute, newAttribute)) {
      resolved = { kind: 'unsupported', reason: 'type-changed' };
    }

    if (newAttribute ?? oldAttribute) {
      let byName = inFlightDefinitions.get(uid);
      if (!byName) {
        byName = new Map();
        inFlightDefinitions.set(uid, byName);
      }
      byName.set(newName, (newAttribute ?? oldAttribute) as RenameAttributeDefinition);
    }

    if (resolved.kind === 'unsupported') {
      unsupported.push({ uid, oldName, newName, reason: resolved.reason });
      // Keep the chain consistent so a later continuation hop stays silent. The
      // source keeps its in-flight entry and is not vacated: its physical
      // artifact stays where it is until schema sync drops it.
      markInFlight(uid, newName, resolved);
      return;
    }

    // Accepted from here on: the source name is free and the field moves.
    entries?.delete(oldName);
    definitions?.delete(oldName);
    trackVacated(uid, oldName, newName);

    if (resolved.kind === 'skip') {
      markInFlight(uid, newName, resolved);
      return;
    }

    const next = advance(uid, resolved, oldName, newName);
    markInFlight(uid, newName, next);
  };

  return {
    addRenameAttribute(uid: string, names: RenameNames): void {
      addRename(uid, names);
    },

    hasChanges(): boolean {
      return migrationFileBuilder.hasChanges();
    },

    getUnsupported(): UnsupportedRename[] {
      return [...unsupported];
    },

    getOperations() {
      return migrationFileBuilder.getOperations();
    },

    build(): BuiltMigration | null {
      return migrationFileBuilder.build({ name: MIGRATION_NAME, format: getFormat() });
    },

    async writeFiles(): Promise<string | null> {
      // Always write to the app's *source* migrations dir, never the database's
      // configured dir: when `useTypescriptMigrations` is enabled that points at
      // build output (e.g. `dist/database/migrations`), which is gitignored and
      // wiped on the next build, so the generated migration would not be a
      // portable record.
      const dir = sourceMigrationsDir();
      return migrationFileBuilder.writeFiles({ name: MIGRATION_NAME, format: getFormat(), dir });
    },
  };
};

export type MigrationBuilder = ReturnType<typeof createMigrationBuilder>;
