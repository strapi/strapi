'use strict';

const { createQueryBuilder } = require('./query');
const { createRepository } = require('./entity-repository');

const createEntityManager = db => {
  const repoMap = {};

  return {
    async findOne(uid, params) {
      const qb = this.createQueryBuilder(uid)
        .init(params)
        .first();

      return await qb.execute();
    },

    // should we name it findOne because people are used to it ?
    async findMany(uid, params) {
      const qb = this.createQueryBuilder(uid).init(params);

      return await qb.execute();
    },

    // support search directly in find & count -> a search param ? a different feature with a search tables rather

    async findWithCount(uid, params) {
      return await Promise.all([this.findMany(uid, params), this.count(uid, params)]);
    },

    // TODO: define api
    async count(uid, params) {
      const qb = this.createQueryBuilder(uid).where(params.where);

      const res = await qb
        .count()
        .first()
        .execute();

      return Number(res.count);
    },

    // TODO: make it create one somehow
    async create(uid, params) {
      // create entry in DB

      // select fields that go into db
      // format input values for the db
      // change name to column names

      // select relations

      const { data } = params;

      // remove unknow fields or throw
      // rename to columns
      // transform value to storage value
      // apply programatic defaults if any -> I think this should be handled outside of this layer as we might have some applicative rules in the entity service
      // remove relation entries

      const [id] = await this.createQueryBuilder(uid)
        .insert(data)
        .execute();

      // create relation associations or move this to the entity service & call attach on the repo instead

      return this.findOne(uid, { where: { id }, select: params.select, populate: params.populate });
    },

    async createMany(uid, params) {
      const { data } = params;

      const ids = await this.createQueryBuilder(uid)
        .insert(data)
        .execute();

      return ids.map(id => ({ id }));
    },

    // TODO: make it update one somehow
    // findOne + update with a return
    async update(uid, params) {
      const { where, data } = params;

      /*const r =*/ await this.createQueryBuilder(uid)
        .where(where)
        .update(data)
        .execute();

      return {};
    },

    async updateMany(uid, params) {
      const { where, data } = params;

      return this.createQueryBuilder(uid)
        .where(where)
        .update(data)
        .execute();
    },

    // TODO: make it deleteOne somehow
    // findOne + delete with a return -> should go in the entity service
    async delete(uid, params) {
      return await this.createQueryBuilder(uid)
        .init(params)
        .delete()
        .execute();
    },

    async deleteMany(uid, params) {
      const { where } = params;

      return await this.createQueryBuilder(uid)
        .where(where)
        .delete()
        .execute();
    },

    // populate already loaded entry
    async populate(uid, entry, name, params) {
      return {
        ...entry,
        relation: await this.load(entry, name, params),
      };
    },

    // loads a relation
    load(uid, entry, name, params) {
      const { attributes } = db.metadata.get(uid);

      return this.getRepository(attributes[name].target.uid).findMany({
        ...params,
        where: {
          ...params.where,
          // [parent]: entry.id,
        },
      });
    },

    // method to work with components & dynamic zones
    // addComponent() {},
    // removeComponent() {},
    // setComponent() {},

    // method to work with relations
    attachRelation() {},
    detachRelation() {},
    setRelation() {},

    // cascading
    // aggregations
    // -> avg
    // -> min
    // -> max
    // -> grouping

    // formulas
    // custom queries

    // utilities
    // -> format
    // -> parse
    // -> map result
    // -> map input
    // -> validation

    // extra features
    // -> virtuals
    // -> private
    createQueryBuilder(uid) {
      return createQueryBuilder(uid, db);
    },

    getRepository(uid) {
      if (!repoMap[uid]) {
        repoMap[uid] = createRepository(uid, db);
      }

      return repoMap[uid];
    },

    clearRepositories() {
      repoMap.clear();
    },
  };
};

module.exports = {
  createEntityManager,
};
