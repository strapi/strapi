/**
 * Better Auth database adapter on top of Strapi's Document Service and database layer.
 *
 * Ported from plugin-better-auth by Boaz Poolman (strapi-community), MIT licensed.
 * https://github.com/strapi-community/plugin-better-auth
 *
 * Differences from the original:
 * - Ids are Strapi documentIds, never numeric ids. The adapter never sends an `id` (the Document
 *   Service generates the `documentId`), Better Auth's `id` maps to `documentId` going in
 *   (`mapKeysTransformInput`) and coming out (`mapKeysTransformOutput`), and references such as
 *   `userId` are documentId strings that pass through untouched.
 * - `count` asks the Document Service to count instead of loading every row.
 * - Single-use and counter writes are atomic (see "Two write paths").
 * - A filter that Strapi would silently drop is refused instead (see "Filters fail closed").
 * - Better Auth's own multi-step work (`adapter.transaction`) runs in a Strapi database
 *   transaction, so for instance creating a user and its account is all or nothing.
 *
 * Two write paths
 * ---------------
 * Reads, and `create`, go through the Document Service for every model. Writes split by model:
 *
 * - `user` writes go through the Document Service, so its middlewares and lifecycles run when a
 *   user is changed or removed. That path updates and deletes by documentId, so it cannot carry a
 *   `where` guard into the write and its `updateMany`/`deleteMany` counts come from a prior read;
 *   the user model is therefore not usable for `consumeOne` or `incrementOne`, which refuse it.
 *   Better Auth does not use either on users.
 * - Every other model (session, account, verification, two-factor, rate limit, passkey, jwks, and
 *   whatever a plugin adds) is an engine table. Its writes go straight to `strapi.db.query`, which
 *   skips Document Service middlewares, as intended for tables nobody manages by hand. There each
 *   `updateMany` and `deleteMany` is ONE statement with the `where` in it, and the count it returns
 *   is that statement's own affected-row count. Better Auth builds its race-safe primitives on
 *   exactly that: a single-use token is consumed by the DELETE that removes it, and a guarded
 *   counter is changed by the UPDATE whose `where` still holds. Reading first and writing by id
 *   would let two concurrent callers both win.
 *
 * Filters fail closed
 * -------------------
 * Strapi drops a filter key that is not an attribute of the content type, and every `password`
 * attribute, without saying so, which turns `deleteMany({ userId })` into "delete everything". The
 * adapter checks every field of every `where` against the content type and throws instead, and it
 * refuses an empty `where` wherever one would match an arbitrary or every row.
 *
 * The users-permissions password
 * -------------------------------
 * With the compatibility mode on, a credential account's password is also written to the user's
 * own `password` column (the one users-permissions reads), in the same transaction as the account
 * write, so a project that rolls back finds the password the user last set. Better Auth reaches
 * the account only through `create`, `update` and `updateMany` (sign-up, reset, change and
 * `setPassword` all end in one of them), so those three carry the mirror.
 *
 * Not supported: native joins (`advanced.database.joins`). Better Auth falls back to separate
 * queries when it is left off, which is the default, and the adapter refuses to run with it on.
 */
import type { BetterAuthOptions } from 'better-auth';
import { createAdapterFactory } from 'better-auth/adapters';
import type {
  AdapterFactory,
  AdapterFactoryCustomizeAdapterCreator,
  CleanedWhere,
  DBAdapter,
  JoinConfig,
  ModelTarget,
} from 'better-auth/adapters';
import type { UID } from '@strapi/strapi';

import { readCompatConfig } from '../../../compat/config';
import { PLUGIN_ID, USER_UID } from '../../../constants';
import { singularNameOf } from '../model-names';
import { transformFilters } from './transformers/filters';
import type { StrapiFilters } from './transformers/filters';
import { transformOutput } from './transformers/output';
import { transformSort } from './transformers/sort';

const ID_FIELD = 'id';
const DOCUMENT_ID_FIELD = 'documentId';

/** The models whose writes go through the Document Service. Everything else is an engine table. */
const DOCUMENT_SERVICE_MODELS: ReadonlySet<string> = new Set(['user']);

/**
 * `twoFactor` -> `plugin::end-users.two-factor`, `rateLimit` -> `plugin::end-users.rate-limit`,
 * `jwks` -> `plugin::end-users.jwk`. Every Better Auth model the plugin stores has a content type,
 * named the way the schema generator names it (`singularNameOf`).
 */
const getModelUid = (modelKey: string) =>
  `plugin::${PLUGIN_ID}.${singularNameOf(modelKey)}` as UID.ContentType;

type Row = Record<string, unknown>;

/**
 * The part of the Document Service the adapter uses. The service's own types are generic over a
 * content type uid that is only known at runtime here, so this is the loose shape of one call.
 */
interface Documents {
  create(params: { data: Row }): Promise<Row>;
  findFirst(params: { filters: Row; fields?: string[] }): Promise<Row | null>;
  findMany(params: {
    filters: Row;
    fields?: string[];
    sort?: string;
    limit?: number;
    start?: number;
  }): Promise<Row[]>;
  update(params: { documentId: string; data: Row }): Promise<Row | null>;
  delete(params: { documentId: string }): Promise<{ entries: unknown[] }>;
  count(params: { filters?: Row }): Promise<number>;
}

/**
 * The part of the database layer the engine-table writes use. `where` here is the same filter
 * object the Document Service takes (attribute names, `$eq`, `$and`, ...), but it is applied as
 * written: no sanitizing, no draft/publish handling.
 */
interface Db {
  findOne(params: { where: Row }): Promise<Row | null>;
  findMany(params: { where: Row }): Promise<Row[]>;
  updateMany(params: { where: Row; data: Row }): Promise<{ count: number }>;
  deleteMany(params: { where: Row }): Promise<{ count: number }>;
}

/** Better Auth's caller picks the row type; the adapter only ever handles plain records. */
const asRow = <T>(row: Row) => row as T;

const assertNoJoin = (join: JoinConfig | undefined) => {
  if (join && Object.keys(join).length > 0) {
    throw new Error(
      'The Strapi adapter cannot run native joins. Leave `advanced.database.joins` disabled ' +
        'and Better Auth will query the related models one at a time.'
    );
  }
};

const requireWhere = (operation: string, where: readonly CleanedWhere[] | undefined) => {
  if (!where || where.length === 0) {
    throw new Error(
      `The Strapi adapter refuses ${operation} without a where clause: it would act on an ` +
        'arbitrary or on every row.'
    );
  }
};

const inTransaction = async <T>(work: () => Promise<T>): Promise<T> => {
  const result = await strapi.db.transaction(work);

  return result;
};

const isSnapshotConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  ((error as { errno?: unknown }).errno === 1020 ||
    (error as { code?: unknown }).code === 'ER_CHECKREAD');

/** `{ id } AND <filters>`: the one row that was read, and only while the filters still hold. */
const guardedBy = (id: unknown, filters: StrapiFilters): StrapiFilters => ({
  $and: [{ id }, filters],
});

const createCustomAdapter: AdapterFactoryCustomizeAdapterCreator = ({
  schema,
  getFieldName,
  getDefaultModelName,
}) => {
  const modelKeyOf = ({ model, modelKey }: ModelTarget) => modelKey ?? getDefaultModelName(model);

  const uidOf = (target: ModelTarget) => getModelUid(modelKeyOf(target));

  const documentsOf = (target: ModelTarget) =>
    strapi.documents(uidOf(target)) as unknown as Documents;

  const dbOf = (target: ModelTarget) => strapi.db.query(uidOf(target)) as unknown as Db;

  /** Whether writes to this model must run the Document Service's middlewares. */
  const usesDocumentService = (target: ModelTarget) =>
    DOCUMENT_SERVICE_MODELS.has(modelKeyOf(target));

  const assertEngineTable = (target: ModelTarget, operation: string) => {
    if (usesDocumentService(target)) {
      throw new Error(
        `The Strapi adapter does not support ${operation} on the ${modelKeyOf(target)} model: ` +
          'its writes go through the Document Service, which cannot make them atomic.'
      );
    }
  };

  /** Stored field name for a logical Better Auth field. The id is the documentId. */
  const resolveField = (target: ModelTarget, field: string) =>
    field === ID_FIELD ? DOCUMENT_ID_FIELD : getFieldName({ model: modelKeyOf(target), field });

  /**
   * The attributes of the content type of a model. Only its own attributes count: a name that
   * happens to be on the prototype chain is not one Strapi would apply.
   */
  const attributesOf = (target: ModelTarget) => strapi.getModel(uidOf(target)).attributes;

  /**
   * Throws when `field` is not an attribute of the content type. Strapi drops what is not an
   * attribute without saying so, which turns a condition into "every row" and an increment into
   * "nothing happened".
   */
  const assertAttribute = (
    target: ModelTarget,
    attributes: ReturnType<typeof attributesOf>,
    field: string,
    consequence: string
  ) => {
    if (!Object.hasOwn(attributes, field)) {
      throw new Error(
        `The Strapi adapter cannot use "${field}" on ${uidOf(target)}: it is not an attribute of ` +
          `the content type, so Strapi would drop it and ${consequence}.`
      );
    }
  };

  /**
   * The Strapi filters for a `where`, after checking that Strapi will really apply every one of
   * them. `where` fields arrive already mapped to stored names, `id` as `documentId`.
   */
  const filtersOf = (target: ModelTarget, where: readonly CleanedWhere[] | undefined) => {
    if (where && where.length > 0) {
      const attributes = attributesOf(target);

      for (const { field } of where) {
        if (field === DOCUMENT_ID_FIELD || field === ID_FIELD) {
          continue;
        }

        assertAttribute(target, attributes, field, 'match every row');

        if (attributes[field].type === 'password') {
          throw new Error(
            `The Strapi adapter cannot filter ${uidOf(target)} on "${field}": Strapi never ` +
              'filters on a password attribute, so it would drop the condition and match every row.'
          );
        }
      }
    }

    return transformFilters(where);
  };

  /** The fields an increment or an assignment writes, which must all be attributes. */
  const assertWritable = (
    target: ModelTarget,
    increment: Record<string, number>,
    set: Record<string, unknown> | undefined
  ) => {
    const attributes = attributesOf(target);

    for (const field of [...Object.keys(increment), ...Object.keys(set ?? {})]) {
      assertAttribute(target, attributes, field, 'leave the write undone');
    }
  };

  /** Fields to ask Strapi for. `select` is not mapped by the factory, `where` is. */
  const fieldsOf = (target: ModelTarget, select: string[] | undefined) =>
    select?.length ? select.map((field) => resolveField(target, field)) : undefined;

  /** Strapi hands datetimes back as strings, Better Auth wants `Date` objects. */
  const rowMapper = (target: ModelTarget) => {
    const dateFields = new Set(
      Object.entries(schema[modelKeyOf(target)]?.fields ?? {})
        .filter(([, attribute]) => attribute.type === 'date')
        .map(([name, attribute]) => attribute.fieldName ?? name)
    );

    return <T extends Row>(record: T) => transformOutput(record, dateFields);
  };

  /** The documentId of the first document a `where` matches. */
  const findDocumentId = async (target: ModelTarget, where: readonly CleanedWhere[]) => {
    // An empty where would match any document, and this is for acting on one specific document.
    if (where.length === 0) {
      return undefined;
    }

    const found = await documentsOf(target).findFirst({
      filters: filtersOf(target, where),
      fields: [DOCUMENT_ID_FIELD],
    });

    return found?.documentId as string | undefined;
  };

  /** The documentIds of everything a `where` matches. */
  const findDocumentIds = async (target: ModelTarget, where: readonly CleanedWhere[]) => {
    const found = await documentsOf(target).findMany({
      filters: filtersOf(target, where),
      fields: [DOCUMENT_ID_FIELD],
    });

    return found.map((document) => document.documentId as string);
  };

  /** The numeric id of the first row a `where` matches, for an engine table. */
  const findRowId = async (target: ModelTarget, filters: StrapiFilters) => {
    const found = await dbOf(target).findOne({ where: filters });

    return found?.id;
  };

  /**
   * The first row a `where` matches, locked for the rest of the transaction. A concurrent caller
   * waits here, and when it gets the row it re-evaluates the `where` against what the first one
   * wrote, so a guard that no longer holds finds nothing. Must run inside a transaction.
   */
  const lockRow = (target: ModelTarget, filters: StrapiFilters) =>
    strapi.db
      .queryBuilder(uidOf(target))
      .select('*')
      .where(filters)
      .first()
      .forUpdate()
      .execute<Row | null | undefined>();

  const isAccount = (target: ModelTarget) => modelKeyOf(target) === 'account';

  /** Whether a write to this model may carry a password that must be mirrored. */
  const mirrorsPassword = (target: ModelTarget, data: Row) =>
    isAccount(target) &&
    typeof data[resolveField(target, 'password')] === 'string' &&
    readCompatConfig(strapi).usersPermissions;

  /**
   * Copies a credential account's password to the user row. A raw write through the database
   * layer: the Document Service would take the password for a new credential and hash it again.
   * Runs inside the caller's transaction.
   */
  const mirrorToUser = async (
    target: ModelTarget,
    account: Row,
    password: unknown,
    overrides: Row = {}
  ) => {
    const providerId = overrides[resolveField(target, 'providerId')] ?? account.providerId;
    const userId = account[resolveField(target, 'userId')];

    if (providerId !== 'credential' || typeof userId !== 'string') {
      return;
    }

    await strapi.db
      .query(USER_UID)
      .updateMany({ where: { documentId: userId }, data: { password } });
  };

  return {
    async create({ data, ...target }) {
      if (
        !mirrorsPassword(target, data) ||
        data[resolveField(target, 'providerId')] !== 'credential'
      ) {
        const created = await documentsOf(target).create({ data });

        return asRow(rowMapper(target)(created));
      }

      return inTransaction(async () => {
        const created = await documentsOf(target).create({ data });

        await mirrorToUser(target, created, data[resolveField(target, 'password')]);

        return asRow(rowMapper(target)(created));
      });
    },

    async update({ where, update, ...target }) {
      if (usesDocumentService(target)) {
        // By documentId: Better Auth does not use `update` as a race-safe primitive.
        const documentId = await findDocumentId(target, where);

        if (!documentId) {
          return null;
        }

        const updated = await documentsOf(target).update({ documentId, data: update as Row });

        return updated ? asRow(rowMapper(target)(updated)) : null;
      }

      if (where.length === 0) {
        return null;
      }

      const filters = filtersOf(target, where);

      return inTransaction(async () => {
        const id = await findRowId(target, filters);

        if (id === undefined || id === null) {
          return null;
        }

        // The write carries the where, so it is a no-op if the row stopped matching meanwhile.
        const { count } = await dbOf(target).updateMany({
          where: guardedBy(id, filters),
          data: update as Row,
        });

        const updated = count > 0 ? await dbOf(target).findOne({ where: { id } }) : null;

        if (updated && mirrorsPassword(target, update as Row)) {
          await mirrorToUser(target, updated, (update as Row)[resolveField(target, 'password')]);
        }

        return updated ? asRow(rowMapper(target)(updated)) : null;
      });
    },

    async updateMany({ where, update, ...target }) {
      requireWhere('updateMany', where);

      if (usesDocumentService(target)) {
        return inTransaction(async () => {
          const documents = documentsOf(target);
          let updated = 0;

          for (const documentId of await findDocumentIds(target, where)) {
            // One at a time: they share the transaction, which is a single connection.
            // eslint-disable-next-line no-await-in-loop
            if (await documents.update({ documentId, data: update })) {
              updated += 1;
            }
          }

          return updated;
        });
      }

      const filters = filtersOf(target, where);

      if (!mirrorsPassword(target, update as Row)) {
        const { count } = await dbOf(target).updateMany({ where: filters, data: update });

        return count;
      }

      // `updatePassword` ends here: the accounts are read first, so each one's user is known.
      return inTransaction(async () => {
        const accounts = await dbOf(target).findMany({ where: filters });
        const { count } = await dbOf(target).updateMany({ where: filters, data: update });

        for (const account of accounts) {
          // One at a time: they share the transaction, which is a single connection.
          // eslint-disable-next-line no-await-in-loop
          await mirrorToUser(
            target,
            account,
            (update as Row)[resolveField(target, 'password')],
            update as Row
          );
        }

        return count;
      });
    },

    async delete({ where, ...target }) {
      if (usesDocumentService(target)) {
        const documentId = await findDocumentId(target, where);

        if (documentId) {
          await documentsOf(target).delete({ documentId });
        }

        return;
      }

      if (where.length === 0) {
        return;
      }

      const filters = filtersOf(target, where);

      await inTransaction(async () => {
        const id = await findRowId(target, filters);

        if (id !== undefined && id !== null) {
          await dbOf(target).deleteMany({ where: guardedBy(id, filters) });
        }
      });
    },

    async deleteMany({ where, ...target }) {
      requireWhere('deleteMany', where);

      if (usesDocumentService(target)) {
        return inTransaction(async () => {
          const documents = documentsOf(target);
          let deleted = 0;

          for (const documentId of await findDocumentIds(target, where)) {
            // One at a time: they share the transaction, which is a single connection.
            // eslint-disable-next-line no-await-in-loop
            const result = await documents.delete({ documentId });

            // `entries` lists what the delete removed; a document that vanished first is not counted.
            if (result.entries.length > 0) {
              deleted += 1;
            }
          }

          return deleted;
        });
      }

      const { count } = await dbOf(target).deleteMany({ where: filtersOf(target, where) });

      return count;
    },

    /**
     * Delete the row and return it, or null. Exactly one of several concurrent callers gets the
     * row: the DELETE has the id in its where, so it removes the row once and reports 1 once.
     */
    async consumeOne({ where, ...target }) {
      assertEngineTable(target, 'consumeOne');
      requireWhere('consumeOne', where);

      const filters = filtersOf(target, where);

      return inTransaction(async () => {
        const row = await dbOf(target).findOne({ where: filters });

        if (!row) {
          return null;
        }

        try {
          const { count } = await dbOf(target).deleteMany({ where: guardedBy(row.id, filters) });

          return count === 1 ? asRow(rowMapper(target)(row)) : null;
        } catch (error) {
          // MariaDB's snapshot isolation refuses a delete of a row that another transaction changed
          // after this one read it (error 1020), where other databases delete nothing: the same
          // lost race, so the same answer
          if (isSnapshotConflict(error)) {
            return null;
          }

          throw error;
        }
      });
    },

    /**
     * Add the deltas to, and set the values on, one row, only while the `where` holds, and return
     * the row. Under concurrency the first caller changes the row; a later one reads what it wrote
     * (the row lock below) and either adds to it or, if its guard no longer holds, gets null.
     */
    async incrementOne({ where, increment, set, ...target }) {
      assertEngineTable(target, 'incrementOne');
      requireWhere('incrementOne', where);

      const filters = filtersOf(target, where);

      assertWritable(target, increment, set);

      return inTransaction(async () => {
        const row = await lockRow(target, filters);

        if (!row) {
          return null;
        }

        const data: Row = {};

        for (const [field, value] of Object.entries(set ?? {})) {
          if (value !== undefined) {
            data[field] = value;
          }
        }

        for (const [field, delta] of Object.entries(increment)) {
          const current = Number(row[field] ?? 0);

          if (!Number.isFinite(current)) {
            throw new Error(`The Strapi adapter cannot increment "${field}": it is not a number.`);
          }

          data[field] = current + delta;
        }

        const { count } = await dbOf(target).updateMany({
          where: guardedBy(row.id, filters),
          data,
        });

        if (count !== 1) {
          return null;
        }

        const updated = await dbOf(target).findOne({ where: { id: row.id } });

        return updated ? asRow(rowMapper(target)(updated)) : null;
      });
    },

    async findOne({ where, select, join, ...target }) {
      assertNoJoin(join);
      requireWhere('findOne', where);

      const found = await documentsOf(target).findFirst({
        filters: filtersOf(target, where),
        fields: fieldsOf(target, select),
      });

      return found ? asRow(rowMapper(target)(found)) : null;
    },

    async findMany({ where, limit, offset, select, sortBy, join, ...target }) {
      assertNoJoin(join);

      const found = await documentsOf(target).findMany({
        filters: filtersOf(target, where),
        fields: fieldsOf(target, select),
        sort: transformSort(sortBy, (field) => resolveField(target, field)),
        limit,
        start: offset,
      });

      return found.map((row) => asRow(rowMapper(target)(row)));
    },

    count({ where, ...target }) {
      return documentsOf(target).count(where?.length ? { filters: filtersOf(target, where) } : {});
    },
  };
};

/**
 * `database: strapiAdapter()` in the Better Auth options.
 */
export const strapiAdapter = (): AdapterFactory<BetterAuthOptions> => (options) => {
  const adapter: DBAdapter<BetterAuthOptions> = createAdapterFactory<BetterAuthOptions>({
    config: {
      adapterId: 'strapi',
      // Strapi's Document Service generates the documentId; Better Auth must not send an id.
      disableIdGeneration: true,
      supportsNumericIds: false,
      supportsJSON: true,
      supportsDates: true,
      supportsBooleans: true,
      mapKeysTransformInput: { id: DOCUMENT_ID_FIELD },
      mapKeysTransformOutput: { documentId: ID_FIELD },
      // Strapi keeps the transaction in async local storage, so the adapter itself is the
      // transaction handle: everything it does inside the callback joins the transaction.
      transaction: (callback) => inTransaction(() => callback(adapter)),
    },
    adapter: createCustomAdapter,
  })(options);

  return adapter;
};
