import path from 'path';
import fse from 'fs-extra';
import { snakeCase } from 'lodash/fp';

import type { Core } from '@strapi/types';

import { renderMigration, type PhysicalOp } from './templates';

export interface RenameNames {
  oldName: string;
  newName: string;
}

export interface UnsupportedRename {
  uid: string;
  oldName: string;
  newName: string;
  reason: 'model-not-found' | 'attribute-not-found' | 'unsupported-type';
}

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
 *   the shared link table's `field` column, so it is an `UPDATE`, not DDL.
 * - `skip`: recognised but needs no DB change (e.g. the inverse side of a
 *   bidirectional relation — the join table is named from the owning side).
 * - `unsupported`: cannot be migrated automatically (morph relations, media).
 */
type Resolved =
  | { kind: 'scalarColumn'; table: string; from: string }
  | { kind: 'joinColumn'; table: string; from: string }
  | { kind: 'joinTable'; from: string }
  | { kind: 'component'; table: string; fieldColumn: string; from: string }
  | { kind: 'skip' }
  | { kind: 'unsupported'; reason: UnsupportedRename['reason'] };

/**
 * Produces a sortable, filesystem-safe timestamp (e.g. `2026.06.11T15.16.00.123`).
 *
 * Based on the migration generator's format
 * (packages/generators/generators/src/plops/utils/get-formatted-date.ts) but
 * keeps milliseconds: unlike the CLI generator (driven by humans, one file at a
 * time), these migrations are generated automatically and several saves can land
 * in the same second, so second precision would produce colliding filenames.
 */
const getFormattedTimestamp = (date: Date = new Date()): string => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toJSON()
    .replace(/[-:]/g, '.')
    .replace(/Z$/, '');
};

interface MigrationBuilderDeps {
  strapi: Core.Strapi;
}

export const createMigrationBuilder = ({ strapi }: MigrationBuilderDeps) => {
  const { db } = strapi;

  const operations: PhysicalOp[] = [];
  const unsupported: UnsupportedRename[] = [];

  const { identifiers } = db.metadata;

  // Artifacts "in flight" for the current save, i.e. produced by an earlier
  // rename hop in this same batch (e.g. the intermediate `tmp` field a user
  // routes a swap through). Keyed per uid by the *logical* field name the hop
  // produced; the value records how that field resolves to a physical artifact
  // and its current `from` identifier, so a continuation hop replays from the
  // right place instead of being treated as a brand-new, unknown attribute.
  const inFlight = new Map<string, Map<string, Resolved>>();

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

    // Components & dynamic zones: the attribute name is a value in the link
    // table's `field` column. Media is also a morph join table but lives in the
    // shared `files_related_morphs` table (keyed by related type too), so it is
    // not safe to rewrite here — fall through to unsupported.
    if (
      joinTable?.on &&
      typeof joinTable.on === 'object' &&
      schemaTypeOf(uid, oldName) !== 'media'
    ) {
      const fieldColumn = Object.keys(joinTable.on).find((key) => joinTable.on[key] === oldName);
      if (fieldColumn) {
        return { kind: 'component', table: joinTable.name, fieldColumn, from: oldName };
      }
    }

    if (attribute.type === 'relation') {
      // Morph relations (incl. media) need polymorphic/shared-table handling.
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
  const advance = (
    uid: string,
    resolved: Resolved,
    oldName: string,
    newName: string
  ): { op: PhysicalOp | null; next: Resolved } => {
    const meta = db.metadata.get(uid);
    const comment = `${uid}: rename field "${oldName}" -> "${newName}"`;

    switch (resolved.kind) {
      case 'scalarColumn':
      case 'joinColumn': {
        const to =
          resolved.kind === 'joinColumn'
            ? identifiers.getJoinColumnAttributeIdName(snakeCase(newName))
            : resolveColumn(newName);
        const op: PhysicalOp | null =
          resolved.from === to
            ? null
            : { kind: 'renameColumn', table: resolved.table, from: resolved.from, to, comment };
        return { op, next: { ...resolved, from: to } };
      }
      case 'joinTable': {
        const to = identifiers.getJoinTableName(snakeCase(meta.tableName), snakeCase(newName));
        const op: PhysicalOp | null =
          resolved.from === to ? null : { kind: 'renameTable', from: resolved.from, to, comment };
        return { op, next: { ...resolved, from: to } };
      }
      case 'component': {
        const to = newName;
        const op: PhysicalOp | null =
          resolved.from === to
            ? null
            : {
                kind: 'updateComponentField',
                table: resolved.table,
                fieldColumn: resolved.fieldColumn,
                from: resolved.from,
                to,
                comment,
              };
        return { op, next: { ...resolved, from: to } };
      }
      default:
        return { op: null, next: resolved };
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

    const { op, next } = advance(uid, resolved, oldName, newName);
    if (op) {
      operations.push(op);
    }
    markInFlight(uid, newName, next);
  };

  const resolveMigrationsDir = (): string => {
    const configuredDir = db.config?.settings?.migrations?.dir;
    if (configuredDir) {
      return configuredDir;
    }

    const appRoot = strapi.dirs?.app?.root;
    return path.join(appRoot ?? process.cwd(), 'database', 'migrations');
  };

  return {
    addRenameAttribute(uid: string, names: RenameNames): void {
      addRename(uid, names);
    },

    hasChanges(): boolean {
      return operations.length > 0;
    },

    getUnsupported(): UnsupportedRename[] {
      return [...unsupported];
    },

    build(): BuiltMigration | null {
      if (operations.length === 0) {
        return null;
      }

      const timestamp = getFormattedTimestamp();
      const content = renderMigration({ timestamp, operations });
      // Always `.js`: the runner only globs `*.{js,sql}` and `.ts` files would
      // never execute (see templates.ts for the full rationale).
      const filename = `${timestamp}.rename-fields.js`;

      return { filename, content };
    },

    async writeFiles(): Promise<string | null> {
      const built = this.build();
      if (!built) {
        return null;
      }

      const dir = resolveMigrationsDir();
      await fse.ensureDir(dir);

      // Guard against the (rare) case where a file with the same timestamp
      // already exists, so we never silently overwrite a pending migration.
      let filePath = path.join(dir, built.filename);
      for (let suffix = 1; await fse.pathExists(filePath); suffix += 1) {
        filePath = path.join(dir, built.filename.replace(/\.js$/, `-${suffix}.js`));
      }

      await fse.writeFile(filePath, built.content, 'utf8');

      return filePath;
    },
  };
};

export type MigrationBuilder = ReturnType<typeof createMigrationBuilder>;
