import _ from 'lodash';
import { isOperatorOfType } from '@strapi/utils';
import type { Meta } from '../metadata';
import { isRelation } from '../utils/types';

export type QueryScopeContext = {
  /** Model uid, or join-table name */
  uid: string;
  meta: Meta;
  /** Query type of the main table. A join always gets `select`, also inside an update or delete */
  type: 'select' | 'count' | 'update' | 'delete';
};

/**
 * Unstable: narrows queries with a where condition per model. Rules:
 * docs/docs/packages/core/database/05-query-scopes.md
 */
export interface QueryScope {
  /** Sync, must not query the database. Use only columns of the scoped table. Return null to leave the query unscoped */
  where(ctx: QueryScopeContext): Record<string, unknown> | null;
}

const isPlainObject = (value: unknown): value is Record<string, unknown> => _.isPlainObject(value);

const emptyError = (ctx: QueryScopeContext, what = 'condition') =>
  new Error(`A query scope returned an empty ${what} for ${ctx.uid}: it would match every row`);

// An empty column object adds no SQL. [], { $in: [] } and { $notIn: [] } say what they match
const assertValidColumn = (value: unknown, ctx: QueryScopeContext): void => {
  if (!isPlainObject(value)) {
    return;
  }

  if (Object.keys(value).length === 0) {
    throw emptyError(ctx);
  }

  Object.entries(value).forEach(([operator, operand]) =>
    assertValidOperand(operator, operand, ctx)
  );
};

// Mirrors applyOperator in helpers/where.ts: it ORs an array under an operator other than $in,
// $notIn and $between, and an empty OR adds no SQL. Only $not reads its operand as a column object
const assertValidOperand = (operator: string, operand: unknown, ctx: QueryScopeContext): void => {
  if (Array.isArray(operand) && !isOperatorOfType('array', operator)) {
    if (operand.length === 0) {
      throw emptyError(ctx, operator);
    }

    operand.forEach((sub) => assertValidOperand(operator, sub, ctx));
  } else if (operator === '$not') {
    assertValidColumn(operand, ctx);
  }
};

// Empty groups add no SQL, and a relation key adds a join to every query of the model
const assertValidWhere = (where: unknown, ctx: QueryScopeContext): void => {
  if (typeof where !== 'object' || where === null || Object.keys(where).length === 0) {
    throw emptyError(ctx);
  }

  if (Array.isArray(where)) {
    where.forEach((sub) => assertValidWhere(sub, ctx));
    return;
  }

  for (const [key, value] of Object.entries(where)) {
    if (key === '$and' || key === '$or') {
      if (!Array.isArray(value)) {
        throw new Error(
          `A query scope for ${ctx.uid} returned a ${key} that is not an array: ${key} must be an array`
        );
      }

      if (value.length === 0) {
        throw emptyError(ctx, key);
      }

      value.forEach((sub) => assertValidWhere(sub, ctx));
    } else if (key === '$not') {
      assertValidWhere(value, ctx);
    } else if (isRelation(ctx.meta.attributes[key]?.type ?? '')) {
      throw new Error(
        `A query scope condition for ${ctx.uid} names the relation ${key}: use a column of the scoped table`
      );
    } else {
      assertValidColumn(value, ctx);
    }
  }
};

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

          if (where !== null) {
            assertValidWhere(where, ctx);
          }

          return where;
        })
        .filter((where): where is Record<string, unknown> => where !== null);
    },
  };
};

export type ScopeRegistry = ReturnType<typeof createScopeRegistry>;
