import type { Database } from '..';
import type { Meta } from '../metadata';

/**
 * Which kind of statement the scope is being asked about.
 *
 * `insert` is never passed: a scope narrows rows that already exist, so there is
 * nothing for it to filter on an INSERT. Stamping new rows is the caller's job.
 */
export type QueryScopeOperation = 'select' | 'update' | 'delete' | 'count' | 'max' | 'min';

export interface QueryScopeContext {
  /** Model the query reads from — a content type uid, or a join table name. */
  uid: string;
  meta: Meta;
  db: Database;
  operation: QueryScopeOperation;
}

/**
 * Returns a `where` clause to AND into the query, or a nullish value to leave
 * the query alone.
 */
export type QueryScope = (ctx: QueryScopeContext) => Record<string, unknown> | null | undefined;

export interface QueryScopeProvider {
  /**
   * Registers a scope under `name`, replacing any scope already registered
   * under it. Returns a function that unregisters it again.
   */
  register(name: string, scope: QueryScope): () => void;
  unregister(name: string): void;
  clear(): void;
  has(name: string): boolean;
  /** Every clause the registered scopes want to add to this query. */
  resolve(ctx: QueryScopeContext): Record<string, unknown>[];
  /** Whether any scope is registered at all — lets the hot path bail out early. */
  isEmpty(): boolean;
}

/**
 * Query scopes are `where` clauses the database layer adds to every read and
 * every conditional write, whatever built the query.
 *
 * They exist for row-level access control: a caller that only may see some rows
 * of a table must not be able to reach the others by any route — a hand-written
 * `db.query()`, a relation being populated, a `$or` filter tacked onto a
 * legitimate request, a bulk update, a count. Those routes do not share a
 * service-level choke point, but they all end up building a query, so that is
 * where the clause is applied.
 *
 * A scope is consulted per query and receives the model it is about, so it can
 * decline (return nullish) for models it knows nothing about. Clauses are
 * ANDed with the caller's own filters, which is what makes them impossible to
 * widen from the outside.
 *
 * Scopes run on the hot path. Keep them synchronous and cheap — read the
 * ambient context, look at `meta`, return. Do not query the database from one.
 */
export const createQueryScopeProvider = (): QueryScopeProvider => {
  const scopes = new Map<string, QueryScope>();

  return {
    register(name, scope) {
      scopes.set(name, scope);

      return () => {
        // Only unregister if it is still the same scope: a later `register`
        // under the same name owns the slot now.
        if (scopes.get(name) === scope) {
          scopes.delete(name);
        }
      };
    },

    unregister(name) {
      scopes.delete(name);
    },

    clear() {
      scopes.clear();
    },

    has(name) {
      return scopes.has(name);
    },

    isEmpty() {
      return scopes.size === 0;
    },

    resolve(ctx) {
      if (scopes.size === 0) {
        return [];
      }

      const clauses: Record<string, unknown>[] = [];

      for (const scope of scopes.values()) {
        const clause = scope(ctx);

        if (clause !== null && clause !== undefined) {
          clauses.push(clause);
        }
      }

      return clauses;
    },
  };
};
