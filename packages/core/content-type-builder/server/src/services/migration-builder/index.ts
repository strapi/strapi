import path from 'node:path';

import { contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Core } from '@strapi/types';

import { isReservedAttributeName } from '../builder';

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
  customField?: string;
  targetAttribute?: string | null;
  inversedBy?: string;
  mappedBy?: string;
  configurable?: boolean;
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
 * Whether a relation definition has a counterpart on its target. The live
 * schema carries `inversedBy` / `mappedBy`; the CTB payload carries
 * `targetAttribute`.
 */
const isBidirectionalRelation = (attribute: RenameAttributeDefinition): boolean =>
  Boolean(attribute.inversedBy || attribute.mappedBy || attribute.targetAttribute);

/**
 * Whether the storage of `oldAttribute` can host `newAttribute` after a plain
 * rename of its physical artifact. Anything else must go through the legacy
 * drop-and-recreate path, so the hop is reported as `type-changed`.
 *
 * `resolveType` maps a definition to its storage type. The builder passes one
 * that resolves custom fields (sent as `type: 'customField'` by the admin, but
 * already converted to their underlying type in the live schema).
 */
export const isCompatibleRename = (
  oldAttribute: RenameAttributeDefinition | undefined,
  newAttribute: RenameAttributeDefinition | undefined,
  resolveType: (attribute: RenameAttributeDefinition) => string | undefined = (attribute) =>
    attribute.type
): boolean => {
  const oldType = oldAttribute ? resolveType(oldAttribute) : undefined;
  const newType = newAttribute ? resolveType(newAttribute) : undefined;

  // Without both definitions there is nothing to compare; the metadata-based
  // classification is the only guard we have.
  if (!oldAttribute || !newAttribute || !oldType || !newType) {
    return true;
  }

  if (oldType !== newType) {
    return false;
  }

  // A different custom field on the same underlying type is still a different
  // field.
  if (
    (oldAttribute.customField || newAttribute.customField) &&
    oldAttribute.customField !== newAttribute.customField
  ) {
    return false;
  }

  switch (newType) {
    case 'relation':
      // `manyWay` and a bidirectional `oneToMany` share `relation: 'oneToMany'`,
      // but switching between them moves join-table ownership.
      return (
        oldAttribute.relation === newAttribute.relation &&
        oldAttribute.target === newAttribute.target &&
        isBidirectionalRelation(oldAttribute) === isBidirectionalRelation(newAttribute)
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

/**
 * The database metadata shapes the builder reads, derived from `Core.Strapi`
 * so the Content-Type Builder does not depend on `@strapi/database` directly.
 */
type ModelMeta = NonNullable<ReturnType<Core.Strapi['db']['metadata']['get']>>;

/**
 * A metadata attribute, widened with the relation/join keys the builder
 * inspects (the metadata union only declares them on some members).
 */
type AttributeMeta = ModelMeta['attributes'][string] & {
  relation?: string;
  mappedBy?: string;
  morphColumn?: unknown;
  joinColumn?: { name?: string };
  joinTable?: JoinTableMeta;
};

interface JoinTableMeta {
  name?: string;
  on?: Record<string, unknown>;
  morphColumn?: { typeColumn?: { name?: string } };
}

type SchemaModel = Parameters<typeof contentTypesUtils.getNonVisibleAttributes>[0];

/**
 * Per-uid `origin -> current name` of every received hop, accepted or refused:
 * the logical field is the same field even when its data cannot be carried.
 */
export type AttributeRenamesMapping = Record<string, Record<string, string>>;

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

  // Per uid, logical origin name -> current name, folded over every received hop.
  const origins = new Map<string, Map<string, string>>();

  const trackOrigin = (uid: string, oldName: string, newName: string): void => {
    let byOrigin = origins.get(uid);
    if (!byOrigin) {
      byOrigin = new Map<string, string>();
      origins.set(uid, byOrigin);
    }

    for (const [origin, current] of byOrigin) {
      if (current === oldName) {
        byOrigin.set(origin, newName);
        return;
      }
    }

    // A name that is already an origin but no longer current was re-occupied by
    // something this save did not rename; do not overwrite its logical field.
    if (!byOrigin.has(oldName)) {
      byOrigin.set(oldName, newName);
    }
  };

  const isMorphRelation = (attribute: AttributeMeta): boolean =>
    typeof attribute.relation === 'string' && attribute.relation.startsWith('morph');

  const schemaModelOf = (
    uid: string
  ): { attributes?: Record<string, RenameAttributeDefinition> } | undefined => {
    const contentTypes = strapi.contentTypes as Record<string, unknown> | undefined;
    const components = strapi.components as Record<string, unknown> | undefined;
    return (contentTypes?.[uid] ?? components?.[uid]) as
      | { attributes?: Record<string, RenameAttributeDefinition> }
      | undefined;
  };

  const schemaAttributeOf = (uid: string, name: string): RenameAttributeDefinition | undefined =>
    schemaModelOf(uid)?.attributes?.[name];

  /**
   * The type an attribute is stored as. Custom fields are sent by the admin as
   * `type: 'customField'`, while the live schema already carries their
   * underlying type, so both sides are resolved through the registry.
   */
  const storageTypeOf = (attribute: RenameAttributeDefinition): string | undefined => {
    if (attribute.type !== 'customField' && typeof attribute.customField !== 'string') {
      return attribute.type;
    }

    try {
      const customField = strapi.get('custom-fields').get(attribute.customField as string) as
        | { type?: string }
        | undefined;
      return customField?.type ?? attribute.type;
    } catch {
      // Unknown custom field (e.g. its plugin was removed).
      return attribute.type;
    }
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
    const related = fileMeta.attributes?.related as
      | (AttributeMeta & { morphColumn?: JoinTableMeta['morphColumn'] })
      | undefined;
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
    joinTable: JoinTableMeta | undefined,
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

  const classifyComponent = (
    oldName: string,
    joinTable: JoinTableMeta | undefined
  ): Resolved | undefined => {
    const on = joinTable?.on;
    if (!joinTable?.name || !on || typeof on !== 'object') {
      return undefined;
    }
    const fieldColumn = Object.keys(on).find((key) => on[key] === oldName);
    if (!fieldColumn) {
      return undefined;
    }
    return { kind: 'component', table: joinTable.name, fieldColumn, from: oldName };
  };

  const classifyRelation = (
    meta: ModelMeta,
    attribute: AttributeMeta,
    joinTable: JoinTableMeta | undefined
  ): Resolved => {
    // Polymorphic morph relations need shared-table handling and are not
    // creatable through the CTB UI, so they are left unsupported.
    if (isMorphRelation(attribute) || attribute.morphColumn) {
      return { kind: 'unsupported', reason: 'unsupported-type' };
    }

    // Join column on the owner's own table (`<field>_id`), e.g. useJoinTable:false.
    // The inverse side of a bidirectional join-column relation also carries a
    // `joinColumn` (pointing at `id`), but owns no column.
    if (attribute.joinColumn?.name && !joinTable) {
      if (attribute.mappedBy) {
        return { kind: 'skip' };
      }
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

  /**
   * Whether the schema lets users rename this attribute at all. System
   * attributes (`documentId`, `createdBy`, `locale`, `publishedAt`, review
   * workflow stages…) are also in the metadata and would otherwise be renamed
   * away, only for sync to re-add them empty.
   */
  const isRenamableAttribute = (uid: string, name: string): boolean => {
    const schemaAttribute = schemaAttributeOf(uid, name);
    if (schemaAttribute?.configurable === false || isReservedAttributeName(name)) {
      return false;
    }

    const model = schemaModelOf(uid);
    return !contentTypesUtils.getNonVisibleAttributes(model as SchemaModel).includes(name);
  };

  const classify = (uid: string, oldName: string): Resolved => {
    if (!schemaAttributeOf(uid, oldName)) {
      return { kind: 'unsupported', reason: 'attribute-not-found' };
    }

    if (!isRenamableAttribute(uid, oldName)) {
      return { kind: 'unsupported', reason: 'unsupported-type' };
    }

    const meta = db.metadata.get(uid);
    const attribute = meta.attributes?.[oldName] as AttributeMeta | undefined;

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
    if ('columnName' in attribute && attribute.columnName) {
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

    trackOrigin(uid, oldName, newName);

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
    if (
      resolved.kind !== 'unsupported' &&
      !isCompatibleRename(oldAttribute, newAttribute, storageTypeOf)
    ) {
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

    /**
     * The composed `origin -> final` name of every schema attribute that
     * received hops in this save, per uid. Identity entries (`a -> b -> a`) and
     * origins that are not schema attributes are left out.
     */
    attributeRenamesMapping(): AttributeRenamesMapping {
      const mapping: AttributeRenamesMapping = {};

      for (const [uid, byOrigin] of origins) {
        for (const [origin, final] of byOrigin) {
          if (origin === final || !schemaAttributeOf(uid, origin)) {
            continue;
          }
          mapping[uid] ??= {};
          mapping[uid][origin] = final;
        }
      }

      return mapping;
    },

    /**
     * Adds the logical op that carries this save's renames to the stores keyed
     * by attribute name (admin field permissions, via handlers registered on
     * the database). Call it after every hop so it is the last operation.
     */
    addAttributeRenames(renames: AttributeRenamesMapping): void {
      if (Object.keys(renames).length === 0) {
        return;
      }

      migrationFileBuilder.attributeRenames({
        renames,
        comment:
          "Update stores keyed by attribute name (admin field permissions) for this save's renames",
      });
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
