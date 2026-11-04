import { isString } from 'lodash';
import type { Database } from '..';
import type { Repository, Params } from './types';

const withDefaultPagination = (params: Params) => {
  const { page = 1, pageSize = 10, ...rest } = params;

  return {
    page: Number(page),
    pageSize: Number(pageSize),
    ...rest,
  };
};

type ParamsWithLimits = Omit<Params, 'page' | 'pageSize'> & {
  limit: number;
  offset: number;
};

const withOffsetLimit = (
  params: Params
): [ParamsWithLimits, { page: number; pageSize: number }] => {
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

export const createRepository = (uid: string, db: Database): Repository => {
  return {
    async findOne(params = {}) {
      return await db.entityManager.findOne(uid, params);
    },

    async findMany(params = {}) {
      return await db.entityManager.findMany(uid, params);
    },

    async findWithCount(params = {}) {
      return await Promise.all([
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

    async create(params) {
      return await db.entityManager.create(uid, params);
    },

    async createMany(params) {
      return await db.entityManager.createMany(uid, params);
    },

    async update(params) {
      return await db.entityManager.update(uid, params);
    },

    async updateMany(params) {
      return await db.entityManager.updateMany(uid, params);
    },

    async delete(params) {
      return await db.entityManager.delete(uid, params);
    },

    async deleteMany(params = {}) {
      return await db.entityManager.deleteMany(uid, params);
    },

    async count(params) {
      return await db.entityManager.count(uid, params);
    },

    async attachRelations(id, data) {
      const trx = await db.transaction();
      try {
        await db.entityManager.attachRelations(uid, id, data, { transaction: trx.get() });
        return await trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    },

    async updateRelations(id, data) {
      const trx = await db.transaction();
      try {
        await db.entityManager.updateRelations(uid, id, data, { transaction: trx.get() });
        return await trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    },

    async deleteRelations(id) {
      return await db.entityManager.deleteRelations(uid, id);
    },

    async populate(entity, populate) {
      return await db.entityManager.populate(uid, entity, populate);
    },

    async load(entity, fields, params) {
      return await db.entityManager.load(uid, entity, fields, params);
    },

    async loadPages(entity, field, params) {
      if (!isString(field)) {
        throw new Error(`Invalid load. Expected ${field} to be a string`);
      }

      const { attributes } = db.metadata.get(uid);
      const attribute = attributes[field];

      if (
        !attribute ||
        attribute.type !== 'relation' ||
        !attribute.relation ||
        !['oneToMany', 'manyToMany'].includes(attribute.relation)
      ) {
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
