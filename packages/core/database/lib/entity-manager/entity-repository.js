'use strict';

const { isString } = require('lodash/fp');
const { isAnyToMany } = require('../metadata/relations');

const withDefaultPagination = (params) => {
  const { page = 1, pageSize = 10, ...rest } = params;

  return {
    page: Number(page),
    pageSize: Number(pageSize),
    ...rest,
  };
};

const withOffsetLimit = (params) => {
  const { page, pageSize, ...rest } = withDefaultPagination(params);

  const offset = Math.max(page - 1, 0) * pageSize;
  const limit = pageSize;

  const query = {
    ...rest,
    limit,
    offset,
  };

  return [query, { page, pageSize }];
};

const createRepository = (uid, db) => {
  return {
    findOne(params) {
      return db.entityManager.findOne(uid, params);
    },

    findMany(params) {
      return db.entityManager.findMany(uid, params);
    },

    findWithCount(params) {
      return Promise.all([
        db.entityManager.findMany(uid, params),
        db.entityManager.count(uid, params),
      ]);
    },

    async findPage(params) {
      const [query, { page, pageSize }] = withOffsetLimit(params);

      const [results, total] = await Promise.all([
        db.entityManager.findMany(uid, query),
        db.entityManager.count(uid, query),
      ]);

      return {
        results,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    },

    create(params) {
      return db.entityManager.create(uid, params);
    },

    createMany(params) {
      return db.entityManager.createMany(uid, params);
    },

    update(params) {
      return db.entityManager.update(uid, params);
    },

    updateMany(params) {
      return db.entityManager.updateMany(uid, params);
    },

    delete(params) {
      return db.entityManager.delete(uid, params);
    },

    deleteMany(params) {
      return db.entityManager.deleteMany(uid, params);
    },

    count(params) {
      return db.entityManager.count(uid, params);
    },

    attachRelations(id, data) {
      return db.entityManager.attachRelations(uid, id, data);
    },

    async updateRelations(id, data) {
      const trx = await db.transaction();
      try {
        await db.entityManager.updateRelations(uid, id, data, { transaction: trx.get() });
        return trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    },

    deleteRelations(id) {
      return db.entityManager.deleteRelations(uid, id);
    },

    populate(entity, populate) {
      return db.entityManager.populate(uid, entity, populate);
    },

    load(entity, fields, params) {
      return db.entityManager.load(uid, entity, fields, params);
    },

    async loadPages(entity, field, params) {
      if (!isString(field)) {
        throw new Error(`Invalid load. Expected ${field} to be a string`);
      }

      const { attributes } = db.metadata.get(uid);
      const attribute = attributes[field];

      if (!attribute || attribute.type !== 'relation' || !isAnyToMany(attribute)) {
        throw new Error(`Invalid load. Expected ${field} to be an anyToMany relational attribute`);
      }

      const [query, { page, pageSize }] = withOffsetLimit(params);

      const [results, { count: total }] = await Promise.all([
        db.entityManager.load(uid, entity, field, query),
        db.entityManager.load(uid, entity, field, { ...query, count: true }),
      ]);

      return {
        results,
        pagination: {
          page,
          pageSize,
          pageCount: Math.ceil(total / pageSize),
          total,
        },
      };
    },
  };
};

module.exports = {
  createRepository,
};
