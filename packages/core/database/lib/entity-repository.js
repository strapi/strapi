'use strict';

// use some middleware stack or "use" to add extensions to the db layer somehow
const wrapDebug = obj => {
  const nOjb = {};
  for (const key in obj) {
    nOjb[key] = async function(...args) {
      const result = await obj[key](...args);
      console.log(`[${key}]:`, result);
      return result;
    };
  }

  return nOjb;
};

const createRepository = (uid, db) =>
  wrapDebug({
    findOne(params) {
      return db.entityManager.findOne(uid, params);
    },

    findMany(params) {
      return db.entityManager.findMany(uid, params);
    },

    findWithCount(params) {
      return db.entityManager.findWithCount(uid, params);
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

    populate() {},
    load() {},

    // TODO: TBD
    aggregates: {
      sum() {},
      min() {},
      max() {},
      avg() {},
      count() {},
      groupBy() {},
    },

    // TODO: TBD
    relations: {
      attach() {},
      detach() {},
      set() {},
    },
  });

module.exports = {
  createRepository,
};
