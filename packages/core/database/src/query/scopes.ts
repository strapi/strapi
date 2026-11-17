import type { Knex } from 'knex';
import type { Meta } from '../metadata';

export type QueryScopeContext = { uid: string; meta: Meta };

/**
 * `trx` in `execute()`: the active transaction, else the builder's. In a stream: the builder's.
 * Else null
 */
export type QueryScopePrepareContext = { trx: Knex.Transaction | null };

/**
 * - `where` runs for every uid the builder queries, join-table names included (relation link
 *   reads and deletes). Return null for a uid the scope does not own
 * - `getKnexQuery()` outside `execute()` (nested subqueries) calls `where` without `prepare`.
 *   When its state is not settled, `where` must throw, never return an unscoped result
 * - `prepare` must not query through the query builder, which would run `prepare` again. It
 *   reads with `db.connection` and must call `.transacting(trx)` when `trx` is set: on SQLite a
 *   read outside the open transaction waits forever for the single connection
 * - An empty `where` (`{}`, `[]`, top-level empty `$and` or `$or`) throws. A nested empty `$or`
 *   also matches everything, so never return one
 * - A query builder is single use: do not change or run it again after `execute()` or
 *   `stream()`, because it evaluates the scope conditions only once
 */
export interface QueryScope {
  name: string;
  /** Sync, must not query the database. Return null to leave the query unscoped */
  where(ctx: QueryScopeContext): Record<string, unknown> | null;
  /** Awaited before the query runs */
  prepare?(ctx: QueryScopePrepareContext): Promise<void>;
}

const isEmptyArray = (value: unknown) => Array.isArray(value) && value.length === 0;

// These shapes emit no WHERE, so the query would return every row
const matchesEverything = (where: Record<string, unknown>) =>
  Object.keys(where).length === 0 || isEmptyArray(where.$and) || isEmptyArray(where.$or);

export const createScopeRegistry = () => {
  const scopes = new Map<string, QueryScope>();

  return {
    /** Returns a function that removes the scope */
    register(scope: QueryScope) {
      if (scopes.has(scope.name)) {
        throw new Error(`Query scope "${scope.name}" is already registered`);
      }

      const { name } = scope;
      scopes.set(name, scope);
      let registered = true;

      return () => {
        // A later registration can reuse the name: a second call must not remove it
        if (registered) {
          registered = false;
          scopes.delete(name);
        }
      };
    },

    isEmpty() {
      return scopes.size === 0;
    },

    async prepare(ctx: QueryScopePrepareContext) {
      if (scopes.size === 0) {
        return;
      }

      await Promise.all([...scopes.values()].map((scope) => scope.prepare?.(ctx)));
    },

    where(ctx: QueryScopeContext) {
      return [...scopes.values()]
        .map((scope) => {
          const where = scope.where(ctx);

          // A scope that forgets to return must not leave the query unscoped
          if (where === undefined) {
            throw new Error(`Query scope "${scope.name}" returned undefined: return null instead`);
          }

          if (where !== null && matchesEverything(where)) {
            throw new Error(`Query scope "${scope.name}" returned a where that matches every row`);
          }

          return where;
        })
        .filter((where): where is Record<string, unknown> => where !== null);
    },
  };
};

export type ScopeRegistry = ReturnType<typeof createScopeRegistry>;
