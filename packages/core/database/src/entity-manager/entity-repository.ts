import { isString } from 'lodash/fp';
import { isAnyToMany } from '../metadata/relations';
import type { Database } from '..';
import type { ID } from '../typings';

type Params = Record<string, unknown>;
type Data = Record<string, unknown>;

const withDefaultPagination = (params: Params) => {
  const { page = 1, pageSize = 10, ...rest } = params;

  return {
    page: Number(page),
    pageSize: Number(pageSize),
    ...rest,
  };
};

const withOffsetLimit = (params: Params) => {
  const { page, pageSize, ...rest } = withDefaultPagination(params);

  const offset = Math.max(page - 1, 0) * pageSize;
  const limit = pageSize;

  const query = {
    ...rest,
    limit,
    offset,
  };

  return [query, { page, pageSize }] as const;
};

export const createRepository = (uid: string, db: Database) => {
  return {
    findOne(params: Params) {
      return db.entityManager.findOne(uid, params);
    },

    findMany(params: Params) {
      return db.entityManager.findMany(uid, params);
    },

    findWithCount(params: Params) {
      return Promise.all([
        db.entityManager.findMany(uid, params),
        db.entityManager.count(uid, params),
      ]);
    },

    async findPage(params: Params) {
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

    create(params: Params) {
      return db.entityManager.create(uid, params);
    },

    createMany(params: Params) {
      return db.entityManager.createMany(uid, params);
    },

    update(params: Params) {
      return db.entityManager.update(uid, params);
    },

    updateMany(params: Params) {
      return db.entityManager.updateMany(uid, params);
    },

    clone(id: ID, params: Params) {
      return db.entityManager.clone(uid, id, params);
    },

    delete(params: Params) {
      return db.entityManager.delete(uid, params);
    },

    deleteMany(params: Params) {
      return db.entityManager.deleteMany(uid, params);
    },

    count(params: Params) {
      return db.entityManager.count(uid, params);
    },

    attachRelations(id: ID, data: Data) {
      return db.entityManager.attachRelations(uid, id, data);
    },

    async updateRelations(id: ID, data: Data) {
      const trx = await db.transaction();
      try {
        await db.entityManager.updateRelations(uid, id, data, { transaction: trx.get() });
        return await trx.commit();
      } catch (e) {
        await trx.rollback();
        throw e;
      }
    },

    deleteRelations(id: ID) {
      return db.entityManager.deleteRelations(uid, id);
    },

    cloneRelations(targetId: ID, sourceId: ID, params: Params) {
      return db.entityManager.cloneRelations(uid, targetId, sourceId, params);
    },

    populate(entity: Data, populate: unknown) {
      return db.entityManager.populate(uid, entity, populate);
    },

    load(entity: Data, fields: string[], params: Params) {
      return db.entityManager.load(uid, entity, fields, params);
    },

    async loadPages(entity: Data, field: string[], params: Params) {
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
