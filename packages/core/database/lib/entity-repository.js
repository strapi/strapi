'use strict';

const createRepository = (uid, db) => {
  return {
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

    // TODO: add relation API

    populate() {},
    load() {},
  };
};

module.exports = {
  createRepository,
};
