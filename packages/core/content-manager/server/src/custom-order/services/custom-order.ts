import type { Core, UID } from '@strapi/types';
import { errors } from '@strapi/utils';

import storeUtils from '../../services/utils/store';
import { ENABLED_CACHE_TTL_MS, POSITION_ATTRIBUTE } from '../constants';
import { createDocumentMiddleware } from './document-middleware';
import { computeMove, type Placement } from './utils';

interface StoredConfiguration {
  uid?: string;
  settings?: { customOrder?: boolean };
}

type PositionRow = { [POSITION_ATTRIBUTE]: number | string | null };

const createCustomOrderService = ({ strapi }: { strapi: Core.Strapi }) => {
  const state: {
    enabled: Set<string>;
    loadedAt: number;
    refreshId: number;
    isRefreshing: boolean;
    isInitialized: boolean;
  } = {
    enabled: new Set(),
    loadedAt: 0,
    refreshId: 0,
    isRefreshing: false,
    isInitialized: false,
  };

  /**
   * Only the content types that received the position attribute at register can be ordered.
   */
  const isOrderable = (uid: string) => {
    const model = strapi.getModel(uid as UID.ContentType);

    return model?.attributes?.[POSITION_ATTRIBUTE] !== undefined;
  };

  /**
   * Reads which content types have custom order turned on in their list view settings.
   * The setting lives in the database and can be changed at runtime, possibly from
   * another instance, so it can't be read once and trusted forever.
   */
  const refresh = async () => {
    state.refreshId += 1;
    const refreshId = state.refreshId;

    const configurations: StoredConfiguration[] = await storeUtils.getAllConfigurations();

    // A more recent refresh has started in the meantime, its result is the one to keep
    if (refreshId !== state.refreshId) {
      return;
    }

    state.enabled = new Set(
      configurations.flatMap(({ uid, settings }) =>
        uid && settings?.customOrder === true && isOrderable(uid) ? [uid] : []
      )
    );
    state.loadedAt = Date.now();
  };

  const refreshInBackgroundIfStale = () => {
    if (state.isRefreshing || Date.now() - state.loadedAt < ENABLED_CACHE_TTL_MS) {
      return;
    }

    state.isRefreshing = true;

    refresh()
      .catch((error: unknown) => {
        strapi.log.warn(
          `[custom-order] Could not refresh the list of ordered content types: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      })
      .finally(() => {
        state.isRefreshing = false;
      });
  };

  const getTable = (uid: UID.ContentType) => {
    const { tableName, attributes } = strapi.db.metadata.get(uid);

    const columnOf = (attributeName: string) => {
      const attribute = attributes[attributeName];

      return 'columnName' in attribute && attribute.columnName
        ? attribute.columnName
        : attributeName;
    };

    return {
      tableName,
      positionColumn: columnOf(POSITION_ATTRIBUTE),
      documentIdColumn: columnOf('documentId'),
    };
  };

  const toPosition = (value: number | string | null | undefined) =>
    value === null || value === undefined ? undefined : Number(value);

  /**
   * Position of a document, or undefined if it has none (or does not exist).
   */
  const getPosition = async (uid: UID.ContentType, documentId: string) => {
    const row = await strapi.db
      .queryBuilder(uid)
      .select([POSITION_ATTRIBUTE])
      .where({ documentId, [POSITION_ATTRIBUTE]: { $notNull: true } })
      .first()
      .execute<PositionRow | undefined>();

    return toPosition(row?.[POSITION_ATTRIBUTE]);
  };

  /**
   * Position that puts a document before every other one.
   */
  const getTopPosition = async (uid: UID.ContentType) => {
    const row = await strapi.db
      .queryBuilder(uid)
      .min(POSITION_ATTRIBUTE)
      .first()
      .execute<{ min: number | string | null } | undefined>();

    const min = toPosition(row?.min);

    return min === undefined ? 0 : min - 1;
  };

  /**
   * Gives a position to every row that has none.
   *
   * - Rows of a document that already has a position (e.g. a locale created outside of the
   *   Document Service) take that position.
   * - If nothing is ordered yet, documents are ordered by creation, which is the order the
   *   API returned so far.
   * - Otherwise the remaining documents were created while custom order was off: like any
   *   new entry they go on top, the most recent first.
   */
  const assignMissingPositions = async (uid: UID.ContentType) => {
    const { tableName, positionColumn, documentIdColumn } = getTable(uid);
    const knex = strapi.db.connection;

    await strapi.db.transaction(async ({ trx }) => {
      const table = () => strapi.db.getConnection(tableName).transacting(trx);

      const rowWithoutPosition = await table().whereNull(positionColumn).first('id');

      if (!rowWithoutPosition) {
        return;
      }

      // The updated table can't be read directly in a sub query of its own update on MySQL,
      // the aggregated derived tables below are what make these statements portable.
      const documentIdOfUpdatedRow = knex.ref(`${tableName}.${documentIdColumn}`);

      const topRow: { min: number | string | null } | undefined = await table()
        .min({ min: positionColumn })
        .first();
      const top = toPosition(topRow?.min);

      if (top !== undefined) {
        const knownPositions = strapi.db
          .getConnection(tableName)
          .select({ d: documentIdColumn })
          .max({ p: positionColumn })
          .whereNotNull(positionColumn)
          .groupBy(documentIdColumn)
          .as('x');

        const positionOfDocument = knex
          .queryBuilder()
          .select('x.p')
          .from(knownPositions)
          .where('x.d', documentIdOfUpdatedRow);

        await table()
          .whereNull(positionColumn)
          .update({ [positionColumn]: knex.raw('(?)', [positionOfDocument]) });
      }

      const firstRowIds = strapi.db
        .getConnection(tableName)
        .select({ d: documentIdColumn })
        .min({ m: 'id' })
        .groupBy(documentIdColumn)
        .as('x');

      const firstRowIdOfDocument = knex
        .queryBuilder()
        .select('x.m')
        .from(firstRowIds)
        .where('x.d', documentIdOfUpdatedRow);

      await table()
        .whereNull(positionColumn)
        .update({
          [positionColumn]:
            top === undefined
              ? knex.raw('(?)', [firstRowIdOfDocument])
              : knex.raw('? - (?)', [top, firstRowIdOfDocument]),
        });
    });
  };

  const service = {
    isOrderable,

    refresh,

    /**
     * Whether the entries of a content type currently follow a custom order.
     */
    isEnabled(uid: string) {
      refreshInBackgroundIfStale();

      return state.enabled.has(uid);
    },

    async bootstrap() {
      // Prevent initializing the service twice
      if (state.isInitialized) {
        return;
      }

      state.isInitialized = true;

      await refresh();

      for (const uid of state.enabled) {
        await assignMissingPositions(uid as UID.ContentType);
      }

      strapi.documents.use(createDocumentMiddleware(service));
    },

    /**
     * To call after the list view settings of a content type have been saved.
     */
    async applySettings(uid: UID.ContentType, settings?: { customOrder?: boolean } | null) {
      if (settings?.customOrder === true && isOrderable(uid)) {
        await assignMissingPositions(uid);
      }

      await refresh();
    },

    getTopPosition,

    assignMissingPositions,

    /**
     * Makes sure every row of a document shares the document's position. Needed when a row
     * is created for an existing document, typically a new locale.
     */
    async syncDocumentPosition(uid: UID.ContentType, documentId: string) {
      const position = (await getPosition(uid, documentId)) ?? (await getTopPosition(uid));

      await strapi.db
        .queryBuilder(uid)
        .update({ [POSITION_ATTRIBUTE]: position })
        .where({ documentId, [POSITION_ATTRIBUTE]: { $null: true } })
        .execute();
    },

    /**
     * Places a document right before or after another one.
     *
     * Writes go through the query builder on purpose: the position is not content, so
     * moving a document must not run lifecycles nor touch `updatedAt`, which would flag
     * every shifted entry as modified.
     */
    async move({
      uid,
      documentId,
      anchorId,
      placement,
    }: {
      uid: UID.ContentType;
      documentId: string;
      anchorId: string;
      placement: Placement;
    }) {
      const { positionColumn } = getTable(uid);

      await strapi.db.transaction(async () => {
        await assignMissingPositions(uid);

        const from = await getPosition(uid, documentId);
        const anchor = await getPosition(uid, anchorId);

        if (from === undefined || anchor === undefined) {
          throw new errors.NotFoundError('Document not found');
        }

        const plan = computeMove({ from, anchor, placement });

        if (!plan) {
          return;
        }

        if (plan.shift) {
          const { from: start, to: end, by } = plan.shift;

          const shiftedRows = strapi.db.queryBuilder(uid).where({
            [POSITION_ATTRIBUTE]: end === null ? { $gte: start } : { $gte: start, $lte: end },
          });

          await (
            by === 1 ? shiftedRows.increment(positionColumn) : shiftedRows.decrement(positionColumn)
          ).execute();
        }

        await strapi.db
          .queryBuilder(uid)
          .update({ [POSITION_ATTRIBUTE]: plan.position })
          .where({ documentId })
          .execute();
      });
    },
  };

  return service;
};

export type CustomOrderService = ReturnType<typeof createCustomOrderService>;

export { createCustomOrderService };
