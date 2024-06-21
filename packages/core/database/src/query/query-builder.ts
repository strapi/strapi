import type { Knex } from 'knex';
import _ from 'lodash/fp';

import type { Database } from '..';

import { DatabaseError } from '../errors';
import { transactionCtx } from '../transaction-context';
import { isKnexQuery } from '../utils/knex';
import * as helpers from './helpers';
import type { Join } from './helpers/join';

interface State {
  type: 'select' | 'insert' | 'update' | 'delete' | 'count' | 'max' | 'truncate';
  select: Array<string | Knex.Raw>;
  count: string | null;
  max: string | null;
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

  shouldUseDistinct(): boolean;

  shouldUseDeepSort(): boolean;

  processSelect(): void;

  getKnexQuery(): Knex.QueryBuilder;

  execute<T>(options?: { mapResults?: boolean }): Promise<T>;

  stream(options?: { mapResults?: boolean }): helpers.ReadableQuery;
}

const createQueryBuilder = (
  uid: string,
  db: Database,
  initialState: Partial<State> = {}
): QueryBuilder => {
  const meta = db.metadata.get(uid);
  const { tableName } = meta;

  const state: State = _.defaults(
    {
      type: 'select',
      select: [],
      count: null,
      max: null,
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
    },
    initialState
  );

  const getAlias = () => {
    const alias = `t${state.aliasCounter}`;

    state.aliasCounter += 1;

    return alias;
  };

  return {
    alias: getAlias(),
    getAlias,
    state,

    clone() {
      return createQueryBuilder(uid, db, state);
    },

    select(args) {
      state.type = 'select';
      state.select = _.uniq(_.castArray(args));

      return this;
    },

    addSelect(args) {
      state.select = _.uniq([...state.select, ..._.castArray(args)]);

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
      const { _q, filters, where, select, limit, offset, orderBy, groupBy, populate } = params;

      if (!_.isNil(where)) {
        this.where(where);
      }

      if (!_.isNil(_q)) {
        this.search(_q);
      }

      if (!_.isNil(select)) {
        this.select(select);
      } else {
        this.select('*');
      }

      if (!_.isNil(limit)) {
        this.limit(limit);
      }

      if (!_.isNil(offset)) {
        this.offset(offset);
      }

      if (!_.isNil(orderBy)) {
        this.orderBy(orderBy);
      }

      if (!_.isNil(groupBy)) {
        this.groupBy(groupBy);
      }

      if (!_.isNil(populate)) {
        this.populate(populate);
      }

      if (!_.isNil(filters)) {
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

      if (!_.isNil(alias)) {
        return `${alias}.${key}`;
      }

      return this.mustUseAlias() ? `${this.alias}.${key}` : key;
    },

    raw: db.connection.raw.bind(db.connection),

    shouldUseSubQuery() {
      return ['delete', 'update'].includes(state.type) && state.joins.length > 0;
    },

    runSubQuery() {
      this.select('id');
      const subQB = this.getKnexQuery();

      const nestedSubQuery = db.getConnection().select('id').from(subQB.as('subQuery'));
      const connection = db.getConnection(tableName);

      return (connection[state.type] as Knex)().whereIn('id', nestedSubQuery);
    },

    processState() {
      state.orderBy = helpers.processOrderBy(state.orderBy, { qb: this, uid, db });

      if (!_.isNil(state.filters)) {
        if (_.isFunction(state.filters)) {
          const filters = state.filters({ qb: this, uid, meta, db });

          if (!_.isNil(filters)) {
            state.where.push(filters);
          }
        } else {
          state.where.push(state.filters);
        }
      }

      state.where = helpers.processWhere(state.where, { qb: this, uid, db });
      state.populate = helpers.processPopulate(state.populate, { qb: this, uid, db });

      state.data = helpers.toRow(meta, state.data);

      this.processSelect();
    },

    shouldUseDistinct() {
      return state.joins.length > 0 && _.isEmpty(state.groupBy);
    },

    shouldUseDeepSort() {
      return (
        state.orderBy
          .filter(({ column }) => column.indexOf('.') >= 0)
          .filter(({ column }) => {
            const col = column.split('.');

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
          return _.keys(join.orderBy).map((key) => this.aliasColumn(key, join.alias));
        });
        const orderByColumns = state.orderBy.map(({ column }) => column);

        state.select = _.uniq([...joinsOrderByColumns, ...orderByColumns, ...state.select]);
      }
    },

    getKnexQuery() {
      if (!state.type) {
        this.select('*');
      }

      const aliasedTableName = this.mustUseAlias() ? `${tableName} as ${this.alias}` : tableName;

      const qb = db.getConnection(aliasedTableName);

      if (this.shouldUseSubQuery()) {
        return this.runSubQuery();
      }

      this.processState();

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
        case 'insert': {
          qb.insert(state.data);

          if (db.dialect.useReturning() && _.has('id', meta.attributes)) {
            qb.returning('id');
          }

          break;
        }
        case 'update': {
          if (state.data) {
            qb.update(state.data);
          }
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

      if (!_.isEmpty(state.increments)) {
        state.increments.forEach((incr) => qb.increment(incr.column, incr.amount));
      }

      if (!_.isEmpty(state.decrements)) {
        state.decrements.forEach((decr) => qb.decrement(decr.column, decr.amount));
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

      if (state.orderBy.length > 0) {
        qb.orderBy(state.orderBy);
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

      if (state.joins.length > 0) {
        helpers.applyJoins(qb, state.joins);
      }

      if (this.shouldUseDeepSort()) {
        return helpers.wrapWithDeepSort(qb, { qb: this, db, uid });
      }

      return qb;
    },

    async execute({ mapResults = true } = {}) {
      try {
        const qb = this.getKnexQuery();

        const transaction = transactionCtx.get();
        if (transaction) {
          qb.transacting(transaction);
        }

        const rows = await qb;

        if (state.populate && !_.isNil(rows)) {
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
