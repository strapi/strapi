'use strict';

const _ = require('lodash/fp');

const helpers = require('./helpers');

const createQueryBuilder = (uid, db) => {
  const meta = db.metadata.get(uid);
  const { tableName } = meta;

  const state = {
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
    orderBy: [],
    groupBy: [],
  };

  let counter = 0;
  const getAlias = () => `t${counter++}`;

  return {
    alias: getAlias(),
    getAlias,
    state,

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

    count(count = '*') {
      state.type = 'count';
      state.count = count;

      return this;
    },

    max(column) {
      state.type = 'max';
      state.max = column;

      return this;
    },

    where(where = {}) {
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
      state.joins.push(join);
      return this;
    },

    mustUseAlias() {
      return ['select', 'count'].includes(state.type);
    },

    aliasColumn(key, alias) {
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

    raw(...args) {
      return db.connection.raw(...args);
    },

    shouldUseSubQuery() {
      return ['delete', 'update'].includes(state.type) && state.joins.length > 0;
    },

    runSubQuery() {
      this.select('id');
      const subQB = this.getKnexQuery();

      const nestedSubQuery = db
        .getConnection()
        .select('id')
        .from(subQB.as('subQuery'));

      return db
        .getConnection(tableName)
        [state.type]()
        .whereIn('id', nestedSubQuery);
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

    processSelect() {
      state.select = state.select.map(field => helpers.toColumnName(meta, field));

      if (this.shouldUseDistinct()) {
        const joinsOrderByColumns = state.joins.flatMap(join => {
          return _.keys(join.orderBy).map(key => this.aliasColumn(key, join.alias));
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
          qb.select(state.select.map(column => this.aliasColumn(column)));

          if (this.shouldUseDistinct()) {
            qb.distinct();
          }

          break;
        }
        case 'count': {
          const dbColumnName =
            state.count === '*'
              ? this.aliasColumn(helpers.toColumnName(meta, 'id'))
              : this.aliasColumn(helpers.toColumnName(meta, state.count));

          qb.countDistinct({ count: dbColumnName });
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
          qb.update(state.data);
          break;
        }
        case 'delete': {
          qb.delete();

          break;
        }
        case 'truncate': {
          db.truncate();
          break;
        }
      }

      if (state.transaction) {
        qb.transacting(state.transaction);
      }

      if (state.forUpdate) {
        qb.forUpdate();
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
        qb.where(subQb => {
          helpers.applySearch(subQb, state.search, { qb: this, db, uid });
        });
      }

      if (state.joins.length > 0) {
        helpers.applyJoins(qb, state.joins);
      }

      return qb;
    },

    async execute({ mapResults = true } = {}) {
      try {
        const qb = this.getKnexQuery();

        const rows = await qb;

        if (state.populate && !_.isNil(rows)) {
          await helpers.applyPopulate(_.castArray(rows), state.populate, { qb: this, uid, db });
        }

        let results = rows;
        if (mapResults && state.type === 'select') {
          results = helpers.fromRow(meta, rows);
        }

        return results;
      } catch (error) {
        db.dialect.transformErrors(error);
      }
    },
  };
};

module.exports = createQueryBuilder;
