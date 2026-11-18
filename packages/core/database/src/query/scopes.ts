import type { Meta } from '../metadata';

export type QueryScopeContext = {
  /** Model uid, or join-table name */
  uid: string;
  meta: Meta;
  /** Query type of the main table. A join always gets `select`, also inside an update or delete */
  type: 'select' | 'count' | 'update' | 'delete';
};

/**
 * Unstable: the contract can change in a minor release
 *
 * - `where` runs for every uid the builder queries, join-table names included (relation link
 *   reads and deletes). Return null for a uid the scope does not own
 * - A query builder is single use: do not change or run it again after `execute()` or
 *   `stream()`, because it evaluates the scope conditions only once
 */
export interface QueryScope {
  /** Sync, must not query the database. Return null to leave the query unscoped */
  where(ctx: QueryScopeContext): Record<string, unknown> | null;
}

export const createScopeRegistry = () => {
  const scopes = new Set<QueryScope>();

  return {
    /** Returns a function that removes the scope */
    register(scope: QueryScope) {
      scopes.add(scope);

      return () => {
        scopes.delete(scope);
      };
    },

    isEmpty() {
      return scopes.size === 0;
    },

    where(ctx: QueryScopeContext) {
      return [...scopes]
        .map((scope) => {
          const where = scope.where(ctx);

          // A scope that forgets to return must not leave the query unscoped
          if (where === undefined) {
            throw new Error('A query scope returned undefined: return null instead');
          }

          return where;
        })
        .filter((where): where is Record<string, unknown> => where !== null);
    },
  };
};

export type ScopeRegistry = ReturnType<typeof createScopeRegistry>;
