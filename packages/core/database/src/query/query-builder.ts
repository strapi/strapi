import type { Knex } from 'knex';
import _ from 'lodash';

import type { Database } from '..';

import { DatabaseError } from '../errors';
import { transactionCtx } from '../transaction-context';
import { applyQueryTimeout, isKnexQuery } from '../utils/knex';
import * as helpers from './helpers';
import type { Join } from './helpers/join';
import type { OrderByValue } from './helpers/order-by';
import type { QueryScopeContext } from './scopes';

interface State {
  type: 'select' | 'insert' | 'update' | 'delete' | 'count' | 'max' | 'min' | 'truncate';
  select: Array<string | Knex.Raw>;
  count: string | null;
  max: string | null;
  min: string | null;
  first: boolean;
  data: Record<string, unknown> | (null | Record<string, unknown>)[] | null;
  where: Record<string, unknown>[];
  joins: Join[];
  populate: object | null;
  limit: number | null;
  offset: number | null;
  transaction: any;
  forUpdate: boolean;
  onConflict: any;
  merge: any;
  ignore: boolean;
  orderBy: any[];
  groupBy: any[];
  increments: any[];
  decrements: any[];
  aliasCounter: number;
  filters: any;
  search: string;
  processed: boolean;
  /** False for the subquery of a join scope, so it does not apply the scope conditions twice */
  scoped: boolean;
}

export interface QueryBuilder {
  alias: string;
  state: State;
  raw: Knex.RawBuilder;

  getAlias(): string;

  clone(): QueryBuilder;

  select(args: string | Array<string | Knex.Raw>): QueryBuilder;

  addSelect(args: string | string[]): QueryBuilder;

  insert<TData extends Record<string, unknown> | Record<string, unknown>[]>(
    data: TData
  ): QueryBuilder;

  onConflict(args: any): QueryBuilder;

  merge(args: any): QueryBuilder;

  ignore(): QueryBuilder;

  delete(): QueryBuilder;

  ref(name: string): any;

  update<TData extends Record<string, unknown>>(data: TData): QueryBuilder;

  increment(column: string, amount?: number): QueryBuilder;

  decrement(column: string, amount?: number): QueryBuilder;

  count(count?: string): QueryBuilder;

  max(column: string): QueryBuilder;

  min(column: string): QueryBuilder;

  where(where?: object): QueryBuilder;

  limit(limit: number): QueryBuilder;

  offset(offset: number): QueryBuilder;

  orderBy(orderBy: any): QueryBuilder;

  groupBy(groupBy: any): QueryBuilder;

  populate(populate: any): QueryBuilder;

  search(query: string): QueryBuilder;

  transacting(transaction: any): QueryBuilder;

  forUpdate(): QueryBuilder;

  init(params?: any): QueryBuilder;

  filters(filters: any): void;

  first(): QueryBuilder;

  join(join: any): QueryBuilder;

  mustUseAlias(): boolean;

  aliasColumn(key: any, alias?: string): any;

  shouldUseSubQuery(): boolean;

  runSubQuery(): any;

  processState(): void;

  ensurePaginationOrderStability(): void;

  shouldUseDistinct(): boolean;

  shouldUseDeepSort(): boolean;

  processSelect(): void;

  getKnexQuery(): Knex.QueryBuilder;

  execute<T>(options?: { mapResults?: boolean }): Promise<T>;

  stream(options?: { mapResults?: boolean }): helpers.ReadableQuery;
}

const isScopedType = (type: State['type']): type is QueryScopeContext['type'] =>
  ['select', 'count', 'update', 'delete'].includes(type);

/**
 * An update or delete that does not use ORDER BY to choose rows. `limit: -1` counts as no page,
 * as `ensurePaginationOrderStability` does. The query still emits `LIMIT -1`.
 */
const isUnboundedWrite = (state: Pick<State, 'type' | 'limit' | 'offset' | 'first'>) =>
  (state.type === 'update' || state.type === 'delete') &&
  (state.limit == null || state.limit === -1) &&
  state.offset == null &&
  !state.first;

const createQueryBuilder = (
  uid: string,
  db: Database,
  initialState: Partial<State> = {}
): QueryBuilder => {
  const meta = db.metadata.get(uid);
  const { tableName } = meta;

  /**
   * Drop relation sorts before processOrderBy. Those sorts add joins, and the joins pull a
   * scalar-filtered write onto the subquery path even though an unbounded write does not use
   * the order to choose rows. Scalar sorts stay, so MySQL can still emit UPDATE ... ORDER BY.
   */
  const omitRelationOrder = (orderBy: unknown): unknown => {
    const { attributes } = meta;

    if (typeof orderBy === 'string') {
      return attributes[orderBy]?.type === 'relation' ? [] : orderBy;
    }

    if (Array.isArray(orderBy)) {
      return orderBy.flatMap((entry) => {
        const next = omitRelationOrder(entry);

        if (_.isPlainObject(next) && _.isEmpty(next)) {
          return [];
        }

        return [next];
      });
    }

    if (_.isPlainObject(orderBy)) {
      return Object.fromEntries(
        Object.entries(orderBy).filter(([key]) => attributes[key]?.type !== 'relation')
      );
    }

    return orderBy;
  };

  const state: State = _.defaults({}, initialState, {
    type: 'select',
    select: [],
    count: null,
    max: null,
    min: null,
    first: false,
    data: null,
    where: [],
    joins: [],
    populate: null,
    limit: null,
    offset: null,
    transaction: null,
    forUpdate: false,
    onConflict: null,
    merge: null,
    ignore: false,
    orderBy: [],
    groupBy: [],
    increments: [],
    decrements: [],
    aliasCounter: 0,
    filters: null,
    search: null,
    processed: false,
    scoped: true,
  });

  const isScoped = () => state.scoped && !db.unstable_scopes.isEmpty();

  // EXISTS, not IN: with IN, SQLite probes the link index once per row and per visible id
  const scopeJoin = (alias: string, targetUid: string, idColumn = 'id') => {
    // A join reads its target, also inside an update or delete
    const wheres = db.unstable_scopes.where({
      uid: targetUid,
      meta: db.metadata.get(targetUid),
      type: 'select',
    });

    if (wheres.length === 0) {
      return undefined;
    }

    // The subquery takes its aliases from this query's counter, so none can shadow an outer alias
    const sub = createQueryBuilder(targetUid, db, {
      scoped: false,
      aliasCounter: state.aliasCounter,
    })
      .select([db.connection.raw('1')])
      .where({ id: db.connection.ref(`${alias}.${idColumn}`) });
    wheres.forEach((where) => sub.where(where));

    const query = sub.getKnexQuery();
    state.aliasCounter = sub.state.aliasCounter;

    return db.connection.raw('exists ?', [query]);
  };

  const getAlias = () => {
    const alias = `t${state.aliasCounter}`;

    state.aliasCounter += 1;

    return alias;
  };

  const applyUpdate = (qb: Knex.QueryBuilder) => {
    // knex keeps one counter per column and drops counters on columns that are also in the
    // update data, so sum the amounts per column and reject the overlap.
    const counters = new Map<string, number>();
    const addCounter = (column: unknown, amount: unknown, sign: 1 | -1) => {
      // Knex accepts { column: amount } objects, so expand them one counter per key.
      if (_.isPlainObject(column)) {
        const entries = Object.entries(column as Record<string, unknown>);

        if (entries.length === 0) {
          throw new DatabaseError('Counter column object must specify at least one column');
        }

        entries.forEach(([key, entryAmount]) => addCounter(key, entryAmount, sign));
        return;
      }

      if (typeof column !== 'string' || column.length === 0) {
        throw new DatabaseError('Counter column name must be a non-empty string');
      }

      // JS callers can pass a numeric string; coerce before summing so it is not concatenated.
      let value = NaN;
      if (typeof amount === 'number') {
        value = amount;
      } else if (typeof amount === 'string' && amount.trim() !== '') {
        value = Number(amount);
      }

      if (!Number.isFinite(value)) {
        throw new DatabaseError(
          `Cannot increment or decrement the column "${column}" by a non-numeric amount`
        );
      }

      const columnName = helpers.toColumnName(meta, column);
      counters.set(columnName, (counters.get(columnName) ?? 0) + sign * value);
    };

    state.increments.forEach((incr) => addCounter(incr.column, incr.amount, 1));
    state.decrements.forEach((decr) => addCounter(decr.column, decr.amount, -1));

    if (state.data) {
      const data = state.data as Record<string, unknown>;
      counters.forEach((_amount, column) => {
        if (_.has(data, column)) {
          throw new DatabaseError(
            `Cannot update and increment or decrement the column "${column}" in the same query`
          );
        }
      });

      qb.update(data);
    }

    counters.forEach((amount, column) => qb.increment(column, amount));
  };

  return {
    alias: getAlias(),
    getAlias,
    state,

    clone() {
      const copy = <T>(value: T): T => (Array.isArray(value) ? ([...value] as T) : value);

      return createQueryBuilder(uid, db, {
        ...state,
        select: copy(state.select),
        where: copy(state.where),
        joins: copy(state.joins),
        orderBy: copy(state.orderBy),
        groupBy: copy(state.groupBy),
        increments: copy(state.increments),
        decrements: copy(state.decrements),
      });
    },

    select(args) {
      state.type = 'select';
      state.select = [...new Set(_.castArray(args))];

      return this;
    },

    addSelect(args) {
      state.select = [...new Set([...state.select, ..._.castArray(args)])];

      return this;
    },

    insert(data) {
      state.type = 'insert';
      state.data = data;

      return this;
    },

    onConflict(args) {
      state.onConflict = args;

      return this;
    },

    merge(args) {
      state.merge = args;

      return this;
    },

    ignore() {
      state.ignore = true;

      return this;
    },

    delete() {
      state.type = 'delete';

      return this;
    },

    ref(name) {
      return db.connection.ref(helpers.toColumnName(meta, name));
    },

    update(data) {
      state.type = 'update';
      state.data = data;

      return this;
    },

    increment(column, amount = 1) {
      state.type = 'update';
      state.increments.push({ column, amount });

      return this;
    },

    decrement(column, amount = 1) {
      state.type = 'update';
      state.decrements.push({ column, amount });

      return this;
    },

    count(count = 'id') {
      state.type = 'count';
      state.count = count;

      return this;
    },

    max(column: string) {
      state.type = 'max';
      state.max = column;

      return this;
    },

    min(column: string) {
      state.type = 'min';
      state.min = column;

      return this;
    },

    where(where: Record<string, unknown> = {}) {
      if (!_.isPlainObject(where)) {
        throw new Error('Where must be an object');
      }

      state.where.push(where);

      return this;
    },

    limit(limit) {
      state.limit = limit;
      return this;
    },

    offset(offset) {
      state.offset = offset;
      return this;
    },

    orderBy(orderBy) {
      state.orderBy = orderBy;
      return this;
    },

    groupBy(groupBy) {
      state.groupBy = groupBy;
      return this;
    },

    populate(populate) {
      state.populate = populate;
      return this;
    },

    search(query) {
      state.search = query;
      return this;
    },

    transacting(transaction) {
      state.transaction = transaction;
      return this;
    },

    forUpdate() {
      state.forUpdate = true;
      return this;
    },

    init(params = {}) {
      const {
        _q: searchQuery,
        filters,
        where,
        select,
        limit,
        offset,
        orderBy,
        groupBy,
        populate,
      } = params;

      if (where != null) {
        this.where(where);
      }

      if (searchQuery != null) {
        this.search(searchQuery);
      }

      if (select != null) {
        this.select(select);
      } else {
        this.select('*');
      }

      if (limit != null) {
        this.limit(limit);
      }

      if (offset != null) {
        this.offset(offset);
      }

      if (orderBy != null) {
        this.orderBy(orderBy);
      }

      if (groupBy != null) {
        this.groupBy(groupBy);
      }

      if (populate != null) {
        this.populate(populate);
      }

      if (filters != null) {
        this.filters(filters);
      }

      return this;
    },

    filters(filters) {
      state.filters = filters;
    },

    first() {
      state.first = true;
      return this;
    },

    join(join) {
      if (!join.targetField) {
        state.joins.push(join);
        return this;
      }

      const model = db.metadata.get(uid);
      const attribute = model.attributes[join.targetField];

      helpers.createJoin(
        { db, qb: this, uid },
        {
          alias: this.alias,
          refAlias: join.alias,
          attributeName: join.targetField,
          attribute,
        }
      );

      return this;
    },

    mustUseAlias() {
      return ['select', 'count'].includes(state.type);
    },

    aliasColumn(key: string | unknown, alias: string): string | unknown {
      if (typeof key !== 'string') {
        return key;
      }

      if (key.indexOf('.') >= 0) {
        return key;
      }

      if (alias != null) {
        return `${alias}.${key}`;
      }

      return this.mustUseAlias() ? `${this.alias}.${key}` : key;
    },

    raw: db.connection.raw.bind(db.connection),

    shouldUseSubQuery() {
      return ['delete', 'update'].includes(state.type) && state.joins.length > 0;
    },

    runSubQuery() {
      const originalType = state.type;

      // Build the inner SELECT from a clone that stays `select`, so the outer write
      // state is never mutated. clone() gets a new alias — preserve the original one
      // because joins were already baked against it. The clone inherits processed: true.
      const sub = this.clone();
      sub.alias = this.alias;
      // Postgres rejects FOR UPDATE together with DISTINCT. MySQL accepts it, and the
      // clause locks the rows the relation filter reads, so only Postgres drops it.
      if (db.dialect.client === 'postgres') {
        sub.state.forUpdate = false;
      }
      // The inner SELECT must not carry counters meant for the outer write.
      sub.state.increments = [];
      sub.state.decrements = [];

      const selected: Array<string | Knex.Raw> = [`${this.alias}.id`];

      // Ordering only matters when it picks which rows are written: with a limit, an offset or
      // first(). Otherwise drop it, as Postgres and MySQL reject an ORDER BY on a column missing
      // from the DISTINCT select list.
      if (state.limit == null && state.offset == null && !state.first) {
        sub.state.orderBy = [];
      } else {
        // processOrderBy ran while the type was update/delete, so root columns are still bare:
        // qualify them (a bare `id` is ambiguous next to the joined tables), then list every
        // ORDER BY expression in the DISTINCT select, as processSelect does for a select.
        sub.state.orderBy = state.orderBy.map((order) =>
          'column' in order && !order.column.includes('.')
            ? { ...order, column: `${this.alias}.${order.column}` }
            : order
        );

        sub.state.orderBy.forEach((order) => {
          if ('column' in order) {
            selected.push(order.column);
          } else {
            selected.push(
              helpers.buildStatusSortExpression(db, tableName, this.alias, order.isI18n)
            );
          }
        });
      }

      // wrapWithDeepSort prefixes the select with its own alias, so it needs the bare id.
      const subQB = sub.select(sub.shouldUseDeepSort() ? ['id'] : selected).getKnexQuery();

      const nestedSubQuery = db.getConnection().select('id').from(subQB.as('subQuery'));
      const qb = db.getConnection(tableName).whereIn('id', nestedSubQuery);

      if (state.transaction) {
        qb.transacting(state.transaction);
      }

      if (originalType === 'delete') {
        return qb.delete();
      }

      applyUpdate(qb);

      return qb;
    },

    processState() {
      if (this.state.processed) {
        return;
      }

      if (isUnboundedWrite(state)) {
        state.orderBy = omitRelationOrder(state.orderBy) as State['orderBy'];
      }

      state.orderBy = helpers.processOrderBy(state.orderBy, { qb: this, uid, db });

      if (state.filters != null) {
        if (typeof state.filters === 'function') {
          const filters = state.filters({ qb: this, uid, meta, db });

          if (filters != null) {
            state.where.push(filters);
          }
        } else {
          state.where.push(state.filters);
        }
      }

      const scopeType = isScoped() && isScopedType(state.type) ? state.type : null;

      // Copy instead of push: clones share the state.where array, so a push would scope them twice
      if (scopeType) {
        state.where = [...state.where, ...db.unstable_scopes.where({ uid, meta, type: scopeType })];
      }

      state.where = helpers.processWhere(state.where, { qb: this, uid, db });

      // After processWhere, so the joins that filters add are scoped too
      if (scopeType) {
        state.joins = state.joins.map((join) =>
          join.uid ? { ...join, scope: scopeJoin(join.alias, join.uid, join.idColumn) } : join
        );
      }

      // processWhere emits bare root columns while type is still update/delete
      // (mustUseAlias is false). Qualify them now that joins from the relation
      // predicate are known, so overlapping names (published_at, locale, id) are not ambiguous.
      if (this.shouldUseSubQuery()) {
        state.where = helpers.qualifyRootColumns(state.where, this.alias);
      }

      state.populate = helpers.processPopulate(state.populate, { qb: this, uid, db });

      state.data = helpers.toRow(meta, state.data);

      this.ensurePaginationOrderStability();

      this.processSelect();

      this.state.processed = true;
    },

    /**
     * OFFSET/LIMIT without a unique ORDER BY is undefined behavior on SQL databases (notably MySQL).
     * That can repeat or skip rows across pages. Deep sort already appends a primary-key tie-breaker;
     * for all other paginated selects, append id ASC when it is not already the last sort key.
     */
    ensurePaginationOrderStability() {
      if (state.type !== 'select' || state.first) {
        return;
      }

      if (state.limit === null && state.offset === null) {
        return;
      }

      if (state.limit === -1) {
        return;
      }

      if (this.shouldUseDeepSort()) {
        return;
      }

      if (!meta.attributes.id) {
        return;
      }

      const idColumnName = helpers.toColumnName(meta, 'id');
      const aliasedId = this.aliasColumn(idColumnName);
      const lastOrder = state.orderBy[state.orderBy.length - 1];

      if (lastOrder && lastOrder.column === aliasedId) {
        return;
      }

      state.orderBy = [...state.orderBy, { column: aliasedId, order: 'asc' }];
    },

    shouldUseDistinct() {
      return state.joins.length > 0 && _.isEmpty(state.groupBy);
    },

    shouldUseDeepSort() {
      return (
        state.orderBy
          .filter((ob: any) => 'column' in ob && ob.column.indexOf('.') >= 0)
          .filter((ob: any) => {
            const col = ob.column.split('.');

            for (let i = 0; i < col.length - 1; i += 1) {
              const el = col[i];

              // order by "rel"."xxx"
              const isRelationAttribute = meta.attributes[el]?.type === 'relation';

              // order by "t2"."xxx"
              const isAliasedRelation = Object.values(state.joins)
                .map((join) => join.alias)
                .includes(el);

              if (isRelationAttribute || isAliasedRelation) {
                return true;
              }
            }

            return false;
          }).length > 0
      );
    },

    processSelect() {
      state.select = state.select.map((field) => {
        if (isKnexQuery(field)) {
          return field;
        }

        return helpers.toColumnName(meta, field);
      });

      if (this.shouldUseDistinct()) {
        const joinsOrderByColumns = state.joins.flatMap((join) => {
          return Object.keys(join.orderBy ?? {}).map((key) => this.aliasColumn(key, join.alias));
        });
        // Only include column-based orderBy entries here (raw expressions are handled below)
        const orderByColumns = state.orderBy
          .filter((ob: any) => 'column' in ob)
          .map((ob: any) => ob.column);

        state.select = [...new Set([...joinsOrderByColumns, ...orderByColumns, ...state.select])];

        // PostgreSQL requires every ORDER BY expression to appear in the SELECT list when
        // SELECT DISTINCT is used. Raw expressions (e.g. the `status` CASE ranking) are not
        // plain columns, so add them explicitly — using the same builder/alias as the ORDER BY
        // so the rendered SQL matches and PostgreSQL accepts the query. The deep-sort path
        // dedupes via row numbering instead of DISTINCT, so it strips these out later.
        const rawOrderByExpressions = state.orderBy
          .filter((ob: any) => 'rawExpression' in ob)
          .map((ob: any) =>
            helpers.buildStatusSortExpression(db, tableName, this.alias, ob.isI18n)
          );

        state.select = [...state.select, ...rawOrderByExpressions];
      }
    },

    getKnexQuery() {
      if (!state.type) {
        this.select('*');
      }

      const aliasedTableName = this.mustUseAlias() ? `${tableName} as ${this.alias}` : tableName;

      const qb = db.getConnection(aliasedTableName);

      // The state should always be processed before calling shouldUseSubQuery as it
      // relies on the presence or absence of joins to determine the need of a subquery
      this.processState();

      if (this.shouldUseSubQuery()) {
        return this.runSubQuery();
      }

      switch (state.type) {
        case 'select': {
          qb.select(state.select.map((column) => this.aliasColumn(column)));

          if (this.shouldUseDistinct()) {
            qb.distinct();
          }

          break;
        }
        case 'count': {
          const dbColumnName = this.aliasColumn(helpers.toColumnName(meta, state.count));

          if (this.shouldUseDistinct()) {
            qb.countDistinct({ count: dbColumnName });
          } else {
            qb.count({ count: dbColumnName });
          }
          break;
        }
        case 'max': {
          const dbColumnName = this.aliasColumn(helpers.toColumnName(meta, state.max));
          qb.max({ max: dbColumnName });
          break;
        }
        case 'min': {
          const dbColumnName = this.aliasColumn(helpers.toColumnName(meta, state.min));
          qb.min({ min: dbColumnName });
          break;
        }
        case 'insert': {
          qb.insert(state.data);

          if (db.dialect.useReturning() && _.has(meta.attributes, 'id')) {
            qb.returning('id');
          }

          break;
        }
        case 'update': {
          applyUpdate(qb);
          break;
        }
        case 'delete': {
          qb.delete();

          break;
        }
        case 'truncate': {
          qb.truncate();
          break;
        }
        default: {
          throw new Error('Unknown query type');
        }
      }

      if (state.transaction) {
        qb.transacting(state.transaction);
      }

      if (state.forUpdate) {
        qb.forUpdate();
      }

      if (state.onConflict) {
        if (state.merge) {
          qb.onConflict(state.onConflict).merge(state.merge);
        } else if (state.ignore) {
          qb.onConflict(state.onConflict).ignore();
        }
      }

      if (state.limit) {
        qb.limit(state.limit);
      }

      if (state.offset) {
        qb.offset(state.offset);
      }

      if (state.first) {
        qb.first();
      }

      if (state.groupBy.length > 0) {
        qb.groupBy(state.groupBy);
      }

      // if there are joins and it is a delete or update use a sub query
      if (state.where) {
        helpers.applyWhere(qb, state.where);
      }

      // if there are joins and it is a delete or update use a sub query
      if (state.search) {
        qb.where((subQb) => {
          helpers.applySearch(subQb, state.search, { qb: this, db, uid });
        });
      }

      /**
       * Join `orderBy` (e.g. join-table ordinal for relations) must precede root `state.orderBy`
       * when both are emitted. Otherwise pagination stability (`ensurePaginationOrderStability`)
       * appending `id ASC` on the root alias wins over distinct target ids and breaks relation ordering.
       */
      if (state.joins.length > 0) {
        helpers.applyJoins(qb, state.joins);
      }

      if (state.orderBy.length > 0) {
        // `processState` normalizes entries to OrderByValue[] (string/object input from `.init()`).
        const knexOrderBy: helpers.KnexOrderByColumnDescriptor[] = (
          state.orderBy as OrderByValue[]
        ).map((entry) => helpers.toKnexOrderByDescriptor(db, tableName, this.alias, entry));
        // Knex compound `orderBy` typings list `column: string | QueryBuilder` — `Knex.Raw` works at runtime
        // (e.g. `status` sort). See helpers.toKnexOrderByDescriptor / buildStatusSortExpression.
        qb.orderBy(knexOrderBy as never);
      }

      if (this.shouldUseDeepSort()) {
        return helpers.wrapWithDeepSort(qb, { qb: this, db, uid });
      }

      return qb;
    },

    async execute({ mapResults = true } = {}) {
      try {
        const qb = applyQueryTimeout(this.getKnexQuery(), db);

        const transaction = transactionCtx.get();
        if (transaction) {
          qb.transacting(transaction);
        }

        const rows = await qb;

        if (state.populate && rows != null) {
          await helpers.applyPopulate(_.castArray(rows), state.populate, {
            qb: this,
            uid,
            db,
          });
        }

        let results = rows;
        if (mapResults && state.type === 'select') {
          results = helpers.fromRow(meta, rows);
        }

        return results;
      } catch (error) {
        if (error instanceof Error) {
          db.dialect.transformErrors(error);
        } else {
          throw error;
        }
      }
    },

    stream({ mapResults = true } = {}) {
      if (state.type === 'select') {
        return new helpers.ReadableQuery({ qb: this, db, uid, mapResults });
      }

      throw new DatabaseError(
        `query-builder.stream() has been called with an unsupported query type: "${state.type}"`
      );
    },
  };
};

export default createQueryBuilder;
