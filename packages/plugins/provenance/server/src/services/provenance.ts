import type { Core } from '@strapi/types';

import { DOCUMENT_LOCK_UID, FIELD_PROVENANCE_UID } from '../constants';
import {
  claimForField,
  resolveBaseDeclaration,
  resolveFieldDeclaration,
  type RequestSnapshot,
} from '../domain/declaration';
import { getTrackedFields, isEmptyValue } from '../domain/fields';
import { hashValue } from '../domain/hash';
import { toDigitalSourceType } from '../domain/iptc';
import { isAiSource, nextSource } from '../domain/transitions';

import type { Declaration, ProvenanceRow, Source } from '../domain/types';

export type Status = 'draft' | 'published';

export type Target = {
  uid: string;
  documentId: string;
  locale: string | null;
  status: Status;
};

type Values = Record<string, unknown>;

export type FieldView = {
  source: Source;
  signal: ProvenanceRow['signal'];
  /** The value changed outside the Document Service since the provenance was recorded */
  drifted: boolean;
  model: string | null;
  agent: string | null;
  actor: { type: ProvenanceRow['actorType']; id: string | null } | null;
  recordedAt: string | Date | null;
  review: { byId: string; at: string | Date } | null;
  /** A review exists but the value changed after it */
  reviewOutdated: boolean;
};

/**
 * The provenance of one field, given its row (if any) and its current value. A value that
 * no longer matches the recorded hash was changed outside the Document Service.
 */
const toFieldView = (row: ProvenanceRow | undefined, value: unknown): FieldView => {
  if (row === undefined) {
    return {
      source: 'unattributed',
      signal: 'none',
      drifted: false,
      model: null,
      agent: null,
      actor: null,
      recordedAt: null,
      review: null,
      reviewOutdated: false,
    };
  }

  const currentHash = hashValue(value);
  const drifted = row.valueHash !== currentHash;
  const reviewValid =
    row.reviewedHash !== null && row.reviewedHash === currentHash && row.reviewedById !== null;

  return {
    source: drifted ? 'unattributed' : row.source,
    signal: drifted ? 'none' : row.signal,
    drifted,
    model: row.model,
    agent: row.agent,
    actor: { type: row.actorType, id: row.actorId },
    recordedAt: row.recordedAt,
    review:
      reviewValid && row.reviewedAt !== null
        ? { byId: row.reviewedById as string, at: row.reviewedAt }
        : null,
    reviewOutdated: row.reviewedHash !== null && !reviewValid,
  };
};

/**
 * What the Content API exposes of a field's provenance: no actor identifiers.
 */
export const toPublicView = (field: FieldView) => ({
  source: field.source,
  digitalSourceType: toDigitalSourceType(field.source),
  model: field.model,
  agent: field.agent,
  reviewed: field.review !== null,
  reviewedAt: field.review?.at ?? null,
});

const whereTarget = (target: Target) => ({
  targetUid: target.uid,
  targetDocumentId: target.documentId,
  targetLocale: target.locale,
  targetStatus: target.status,
});

const toRow = (
  target: Target,
  field: string,
  source: Source,
  declaration: Declaration,
  valueHash: string,
  now: Date
): ProvenanceRow => ({
  contentType: target.uid,
  documentId: target.documentId,
  locale: target.locale,
  status: target.status,
  fieldPath: field,
  source,
  signal: declaration.signal,
  actorType: declaration.actor.type,
  actorId: 'id' in declaration.actor ? String(declaration.actor.id) : null,
  model: declaration.model ?? null,
  agent: declaration.agent ?? null,
  valueHash,
  reviewedById: null,
  reviewedAt: null,
  reviewedHash: null,
  recordedAt: now,
});

/**
 * Rows are stored with `target*` columns, since `documentId` and `locale` are reserved by
 * the Document Service on the provenance content type itself.
 */
const toData = (row: ProvenanceRow) => ({
  targetUid: row.contentType,
  targetDocumentId: row.documentId,
  targetLocale: row.locale,
  targetStatus: row.status,
  fieldPath: row.fieldPath,
  source: row.source,
  signal: row.signal,
  actorType: row.actorType,
  actorId: row.actorId,
  model: row.model,
  agent: row.agent,
  valueHash: row.valueHash,
  reviewedById: row.reviewedById,
  reviewedAt: row.reviewedAt,
  reviewedHash: row.reviewedHash,
  recordedAt: row.recordedAt,
});

const fromData = (data: Record<string, any>): ProvenanceRow => ({
  id: data.id,
  contentType: data.targetUid,
  documentId: data.targetDocumentId,
  locale: data.targetLocale ?? null,
  status: data.targetStatus,
  fieldPath: data.fieldPath,
  source: data.source,
  signal: data.signal,
  actorType: data.actorType,
  actorId: data.actorId ?? null,
  model: data.model ?? null,
  agent: data.agent ?? null,
  valueHash: data.valueHash,
  reviewedById: data.reviewedById ?? null,
  reviewedAt: data.reviewedAt ?? null,
  reviewedHash: data.reviewedHash ?? null,
  recordedAt: data.recordedAt,
});

export const createProvenanceService = ({ strapi }: { strapi: Core.Strapi }) => {
  const query = () => strapi.db.query(FIELD_PROVENANCE_UID);

  /**
   * Reads provenance rows, oldest first. Outside SQLite the read locks them: a locking read
   * returns the latest committed rows even when the transaction's snapshot is older (MySQL
   * REPEATABLE READ, where the Content Manager reads before the plugin takes its lock).
   */
  const readRows = async (where: Record<string, unknown>): Promise<Array<Record<string, any>>> => {
    const client = strapi.db.dialect?.client;

    if (client === undefined || client === 'sqlite') {
      return query().findMany({ where, orderBy: { id: 'asc' } });
    }

    return strapi.db.entityManager
      .createQueryBuilder(FIELD_PROVENANCE_UID)
      .where(where)
      .orderBy({ id: 'asc' })
      .forUpdate()
      .execute();
  };

  const findRows = async (target: Target) => {
    // Oldest first: if a field ever has two rows, the latest one wins
    const rows = await readRows(whereTarget(target));

    return new Map<string, ProvenanceRow>(
      rows.map((row: Record<string, any>) => [row.fieldPath, fromData(row)])
    );
  };

  /**
   * Replaces the rows of the given fields with `rows`, in two queries whatever their count.
   * The delete is skipped when the caller knows none of these fields has a row yet.
   */
  const replaceRows = async (
    target: Target,
    rows: ProvenanceRow[],
    { hasExisting = true } = {}
  ) => {
    if (rows.length === 0) {
      return;
    }

    if (hasExisting) {
      await query().deleteMany({
        where: { ...whereTarget(target), fieldPath: { $in: rows.map((row) => row.fieldPath) } },
      });
    }

    await query().createMany({ data: rows.map(toData) });
  };

  return {
    /**
     * Records the provenance of the tracked fields a write changed.
     *
     * `before` is the entry as stored before the write (`null` when the write created it),
     * `after` the entry as returned by the Document Service. A field counts as changed when
     * its hash differs, so re-sending an unchanged form does not touch its provenance.
     */
    async recordWrite({
      target,
      fields,
      before,
      after,
      snapshot,
      isNewDocument = false,
    }: {
      target: Target;
      fields: string[];
      before: Values | null;
      after: Values;
      snapshot: RequestSnapshot | null;
      isNewDocument?: boolean;
    }): Promise<Array<{ field: string; declaration: Declaration }>> {
      const changed = fields.filter((field) => {
        if (before === null) {
          return !isEmptyValue(after[field]);
        }

        return hashValue(before[field]) !== hashValue(after[field]);
      });

      if (changed.length === 0) {
        return [];
      }

      const existing = isNewDocument ? new Map<string, ProvenanceRow>() : await findRows(target);
      const base = resolveBaseDeclaration(snapshot);
      const now = new Date();

      const declarations = changed.map((field) => ({
        field,
        declaration: resolveFieldDeclaration(base, claimForField(snapshot, field)),
      }));

      const rows = declarations.map(({ field, declaration }) => {
        const previousRow = existing.get(field);
        // Drift: the value we overwrote is not the one the stored provenance describes
        const previousSource =
          previousRow !== undefined &&
          before !== null &&
          previousRow.valueHash === hashValue(before[field])
            ? previousRow.source
            : null;

        return toRow(
          target,
          field,
          nextSource(previousSource, declaration),
          declaration,
          hashValue(after[field]),
          now
        );
      });

      await replaceRows(target, rows, {
        hasExisting: changed.some((field) => existing.has(field)),
      });

      return declarations;
    },

    /**
     * Mirrors the provenance of one status onto the other (publish, discard draft).
     */
    async copyStatus({
      uid,
      documentId,
      locales,
      from,
      to,
    }: {
      uid: string;
      documentId: string;
      locales: Array<string | null>;
      from: Status;
      to: Status;
    }) {
      for (const locale of locales) {
        const source = { uid, documentId, locale, status: from };

        await this.copyRows({ from: source, to: { ...source, status: to } });
      }
    },

    /**
     * Replaces the rows of `to` with copies of the rows of `from`: every field, or `fields`.
     */
    async copyRows({ from, to, fields }: { from: Target; to: Target; fields?: string[] }) {
      const onFields = fields !== undefined ? { fieldPath: { $in: fields } } : {};
      const rows = await readRows({ ...whereTarget(from), ...onFields });

      await query().deleteMany({ where: { ...whereTarget(to), ...onFields } });

      if (rows.length > 0) {
        await query().createMany({
          data: rows.map((row: Record<string, any>) =>
            toData({
              ...fromData(row),
              contentType: to.uid,
              documentId: to.documentId,
              locale: to.locale,
              status: to.status,
            })
          ),
        });
      }
    },

    /**
     * In the other locales of an entry, a non-localized field holds the same value: it gets
     * the same provenance as in `target`.
     */
    async syncAcrossLocales(target: Target, fields: string[]) {
      if (target.locale === null || fields.length === 0) {
        return;
      }

      // i18n decides which attributes are shared between locales
      const nonLocalized: string[] =
        strapi
          .plugin('i18n')
          ?.service('content-types')
          .getNonLocalizedAttributes(strapi.contentType(target.uid as any)) ?? [];
      const shared = fields.filter((field) => nonLocalized.includes(field));

      if (shared.length === 0) {
        return;
      }

      const versions = (await strapi.documents(target.uid as any).findMany({
        filters: { documentId: target.documentId },
        locale: '*',
        status: target.status,
        fields: ['locale'],
      } as any)) as Array<{ locale?: string | null }>;

      for (const { locale } of versions) {
        if (locale && locale !== target.locale) {
          await this.copyRows({ from: target, to: { ...target, locale }, fields: shared });
        }
      }
    },

    /**
     * For a locale about to be created, the non-localized fields among `fields` and an
     * existing locale they can be inherited from, or `null`.
     */
    async findInheritedFields(target: Target, fields: string[]) {
      if (target.locale === null) {
        return null;
      }

      const nonLocalized: string[] =
        strapi
          .plugin('i18n')
          ?.service('content-types')
          .getNonLocalizedAttributes(strapi.contentType(target.uid as any)) ?? [];
      const shared = fields.filter((field) => nonLocalized.includes(field));

      if (shared.length === 0) {
        return null;
      }

      const versions = (await strapi.documents(target.uid as any).findMany({
        filters: { documentId: target.documentId },
        locale: '*',
        status: target.status,
        fields: ['locale'],
      } as any)) as Array<{ locale?: string | null }>;
      const source = versions.find(({ locale }) => locale && locale !== target.locale);

      return source?.locale ? { locale: source.locale, fields: shared } : null;
    },

    async deleteFor({
      uid,
      documentId,
      locales,
      statuses = ['draft', 'published'],
    }: {
      uid: string;
      documentId: string;
      locales: Array<string | null>;
      statuses?: Status[];
    }) {
      for (const locale of locales) {
        await query().deleteMany({
          where: {
            targetUid: uid,
            targetDocumentId: documentId,
            targetLocale: locale,
            targetStatus: { $in: statuses },
          },
        });
      }
    },

    /**
     * Provenance of every tracked field of an entry, checked against its current values.
     */
    /**
     * For each entry with AI fields, how many it has and how many lack a valid review.
     * Drift is not checked: that needs the current values, which a list does not load.
     */
    async summarize({
      uid,
      status,
      locale,
      documentIds,
      fields,
    }: {
      uid: string;
      status: Status;
      /** `undefined` counts every locale */
      locale?: string | null;
      documentIds?: string[];
      /** Only count these fields, for instance the ones the user may read */
      fields?: string[];
    }) {
      const rows = await query().findMany({
        select: [
          'targetDocumentId',
          'targetLocale',
          'fieldPath',
          'valueHash',
          'reviewedHash',
          'reviewedById',
        ],
        orderBy: { id: 'asc' },
        where: {
          targetUid: uid,
          targetStatus: status,
          source: { $in: ['ai-generated', 'ai-assisted'] },
          ...(locale !== undefined ? { targetLocale: locale } : {}),
          ...(documentIds !== undefined ? { targetDocumentId: { $in: documentIds } } : {}),
          ...(fields !== undefined ? { fieldPath: { $in: fields } } : {}),
        },
      });

      // One count per field, even if a field ever has two rows
      const latest = new Map<string, Record<string, any>>(
        rows.map((row: Record<string, any>) => [
          `${row.targetDocumentId}|${row.targetLocale}|${row.fieldPath}`,
          row,
        ])
      );

      return [...latest.values()].reduce(
        (acc: Record<string, { ai: number; toReview: number }>, row) => {
          const summary = acc[row.targetDocumentId] ?? { ai: 0, toReview: 0 };
          const reviewed = row.reviewedById !== null && row.reviewedHash === row.valueHash;

          acc[row.targetDocumentId] = {
            ai: summary.ai + 1,
            toReview: summary.toReview + (reviewed ? 0 : 1),
          };

          return acc;
        },
        {}
      );
    },

    /**
     * The documents of a content type with at least one AI field left to review, computed in
     * the database. Drift is not checked: that needs the current values. Returns `null` when
     * more than `limit` match, since they could not be passed on as a filter.
     */
    async findDocumentsToReview({
      uid,
      status,
      locale,
      limit,
    }: {
      uid: string;
      status: Status;
      locale?: string | null;
      limit: number;
    }): Promise<string[] | null> {
      const { tableName, attributes } = strapi.db.metadata.get(FIELD_PROVENANCE_UID);
      const column = (name: string) =>
        (attributes[name] as { columnName?: string }).columnName ?? name;

      // `getConnection` applies the configured database schema, like the query engine
      const query = strapi.db
        .getConnection(tableName)
        .distinct(column('targetDocumentId'))
        .where(column('targetUid'), uid)
        .where(column('targetStatus'), status)
        .whereIn(column('source'), ['ai-generated', 'ai-assisted'])
        .where((builder: any) =>
          builder
            .whereNull(column('reviewedById'))
            .orWhereNull(column('reviewedHash'))
            .orWhereRaw('?? <> ??', [column('reviewedHash'), column('valueHash')])
        )
        .limit(limit + 1);

      if (locale !== undefined) {
        query.where(column('targetLocale'), locale);
      }

      const rows: Array<Record<string, string>> = await query;

      return rows.length > limit ? null : rows.map((row) => row[column('targetDocumentId')]);
    },

    /**
     * Fields of an entry version whose recorded source is AI, without reading its values.
     */
    async findAiFields(target: Target) {
      const rows = await findRows(target);

      return [...rows.values()].filter((row) => isAiSource(row.source)).map((row) => row.fieldPath);
    },

    /**
     * Locks a document until the current transaction ends, so that concurrent writes,
     * reviews and declarations on it run one after the other: each one reads values, stage
     * and rows only once the previous one committed. Call it first in the transaction.
     */
    async lockDocument(uid: string, documentId: string) {
      // SQLite has a single writer: transactions never overlap
      if (strapi.db.dialect.client === 'sqlite') {
        return;
      }

      const { tableName, attributes } = strapi.db.metadata.get(DOCUMENT_LOCK_UID);
      const column = (name: string) =>
        (attributes[name] as { columnName?: string } | undefined)?.columnName ?? name;
      const key = { [column('targetUid')]: uid, [column('targetDocumentId')]: documentId };

      await strapi.db.transaction(async ({ trx }) => {
        const table = () => strapi.db.getConnection(tableName).transacting(trx);
        // An existing row, found by the unique key: MySQL locks the record only, no gap
        const locked = await table().where(key).forUpdate().select('id');

        if (locked.length === 0) {
          // Documents get their row on create, and existing ones at bootstrap: this only
          // covers a document written while the plugin was disabled
          await table()
            .insert(key)
            .onConflict([column('targetUid'), column('targetDocumentId')])
            .merge([column('targetUid')]);
        }
      });
    },

    /**
     * Gives every existing document of the tracked content types its lock row, once per
     * content type, so writes lock an existing row instead of inserting one under load.
     */
    async createMissingLocks() {
      if (strapi.db.dialect.client === 'sqlite') {
        return;
      }

      const store = strapi.store({ type: 'plugin', name: 'provenance', key: 'locks' });
      const done = new Set<string>(((await store.get({})) as string[] | null) ?? []);
      const lock = strapi.db.metadata.get(DOCUMENT_LOCK_UID);
      const lockColumn = (name: string) =>
        (lock.attributes[name] as { columnName?: string } | undefined)?.columnName ?? name;
      const schema = strapi.db.getSchemaName();
      const qualify = (table: string) => (schema ? `${schema}.${table}` : table);
      const ignore = strapi.db.dialect.client === 'postgres' ? '' : 'IGNORE';
      const onConflict =
        strapi.db.dialect.client === 'postgres'
          ? ` ON CONFLICT (${lockColumn('targetUid')}, ${lockColumn('targetDocumentId')}) DO NOTHING`
          : '';

      for (const uid of Object.keys(strapi.contentTypes).filter(
        (name) => name.startsWith('api::') && !done.has(name)
      )) {
        const { tableName, attributes } = strapi.db.metadata.get(uid as any);
        const documentIdColumn =
          (attributes.documentId as { columnName?: string } | undefined)?.columnName ??
          'document_id';

        await strapi.db.connection.raw(
          `INSERT ${ignore} INTO ?? (??, ??) SELECT DISTINCT ?, ?? FROM ?? WHERE ?? IS NOT NULL${onConflict}`,
          [
            qualify(lock.tableName),
            lockColumn('targetUid'),
            lockColumn('targetDocumentId'),
            uid,
            documentIdColumn,
            qualify(tableName),
            documentIdColumn,
          ]
        );
        done.add(uid);
      }

      await store.set({ value: [...done] });
    },

    async getForEntry(target: Target, current: Values): Promise<Record<string, FieldView>> {
      const contentType = strapi.contentType(target.uid as any);
      const fields = getTrackedFields(contentType as any);
      const rows = await findRows(target);

      return Object.fromEntries(
        fields.map((field) => [field, toFieldView(rows.get(field), current[field])])
      );
    },

    /**
     * Provenance of several entries of one content type and status, in one query. Each
     * entry gives its current values; only the tracked fields among them are returned.
     */
    async getForEntries({
      uid,
      status,
      entries,
    }: {
      uid: string;
      status: Status;
      entries: Array<{ documentId: string; locale: string | null; values: Values }>;
    }): Promise<Array<Record<string, FieldView>>> {
      if (entries.length === 0) {
        return [];
      }

      const fields = getTrackedFields(strapi.contentType(uid as any) as any);
      const rows = await query().findMany({
        where: {
          targetUid: uid,
          targetStatus: status,
          targetDocumentId: { $in: [...new Set(entries.map((entry) => entry.documentId))] },
        },
      });
      const byEntry = new Map<string, Map<string, ProvenanceRow>>();

      rows.forEach((data: Record<string, any>) => {
        const row = fromData(data);
        const key = `${row.documentId}|${row.locale}`;
        const entryRows = byEntry.get(key) ?? new Map<string, ProvenanceRow>();

        entryRows.set(row.fieldPath, row);
        byEntry.set(key, entryRows);
      });

      return entries.map(({ documentId, locale, values }) => {
        const entryRows = byEntry.get(`${documentId}|${locale}`);

        return Object.fromEntries(
          fields
            .filter((field) => field in values)
            .map((field) => [field, toFieldView(entryRows?.get(field), values[field])])
        );
      });
    },

    /**
     * Tracked fields whose current value comes from an AI and has no valid human review.
     */
    async findUnreviewedAi(target: Target, current: Values) {
      const tracked = getTrackedFields(strapi.contentType(target.uid as any) as any);
      const rows = await findRows(target);

      // Fails closed: a row recorded as AI stays AI even if its value no longer matches the
      // hash (written outside the Document Service, or read from an older snapshot). Only a
      // review of the current value lets it through.
      return [...rows.values()]
        .filter(
          (row) =>
            tracked.includes(row.fieldPath) &&
            isAiSource(row.source) &&
            !(row.reviewedById !== null && row.reviewedHash === hashValue(current[row.fieldPath]))
        )
        .map((row) => row.fieldPath);
    },

    /**
     * Records that an admin user reviewed the current value of the given fields. A field
     * without provenance keeps `unattributed` as source: reviewing does not tell who wrote it.
     */
    async markReviewed({
      target,
      fields,
      current,
      userId,
    }: {
      target: Target;
      fields: string[];
      current: Values;
      userId: string | number;
    }) {
      const existing = await findRows(target);
      const now = new Date();

      // An empty field nobody wrote has nothing to review
      const reviewed = fields.filter(
        (field) => existing.has(field) || (current[field] !== null && current[field] !== undefined)
      );

      const rows = reviewed.map((field) => {
        const currentHash = hashValue(current[field]);
        const row = existing.get(field);
        const base =
          row !== undefined && row.valueHash === currentHash
            ? row
            : toRow(
                target,
                field,
                'unattributed',
                { origin: 'none', signal: 'none', actor: { type: 'system' } },
                currentHash,
                now
              );

        return {
          ...base,
          reviewedById: String(userId),
          reviewedAt: now,
          reviewedHash: currentHash,
        };
      });

      await replaceRows(target, rows);
    },

    /**
     * An admin user declares, after the fact, that fields contain AI output (for instance
     * text pasted from a chat assistant). Only AI sources can be declared this way.
     */
    async declareAi({
      target,
      fields,
      current,
      userId,
      edited,
      model,
    }: {
      target: Target;
      fields: string[];
      current: Values;
      userId: string | number;
      edited: boolean;
      model?: string;
    }) {
      const existing = await findRows(target);
      const now = new Date();
      const declaration: Declaration = {
        origin: 'ai',
        signal: 'admin-session',
        actor: { type: 'admin-user', id: userId },
        edited,
        model,
      };

      const rows = fields.map((field) => {
        const currentHash = hashValue(current[field]);
        const row = existing.get(field);
        const declared = toRow(
          target,
          field,
          edited ? 'ai-assisted' : 'ai-generated',
          declaration,
          currentHash,
          now
        );

        // A review of the same value holds only if it was already reviewed as AI content:
        // a reviewer who approved it as human-written did not check it as AI output
        if (row !== undefined && row.reviewedHash === currentHash && isAiSource(row.source)) {
          return {
            ...declared,
            reviewedById: row.reviewedById,
            reviewedAt: row.reviewedAt,
            reviewedHash: row.reviewedHash,
          };
        }

        return declared;
      });

      await replaceRows(target, rows);
    },
  };
};

export type ProvenanceService = ReturnType<typeof createProvenanceService>;
