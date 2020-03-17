'use strict';

const _ = require('lodash');
const uploadFiles = require('./utils/upload-files');

module.exports = ({ db, eventHub, entityValidator }) => ({
  /**
   * expose some utils so the end users can use them
   */
  uploadFiles,
  /**
   * Promise to fetch all records
   *
   * @return {Promise}
   */
  async find({ params, populate }, { model }) {
    const { kind } = db.getModel(model);

    // return first element and ingore filters
    if (kind === 'singleType') {
      const results = await db.query(model).find({ _limit: 1 }, populate);
      return _.first(results) || null;
    }

    return db.query(model).find(params, populate);
  },

  /**
   * Promise to fetch record
   *
   * @return {Promise}
   */

  findOne({ params, populate }, { model }) {
    return db.query(model).findOne(params, populate);
  },

  /**
   * Promise to count record
   *
   * @return {Promise}
   */

  count({ params }, { model }) {
    return db.query(model).count(params);
  },

  /**
   * Promise to add record
   *
   * @return {Promise}
   */

  async create({ data, files }, { model }) {
    const { kind } = db.getModel(model);

    if (kind === 'singleType') {
      // check if there is already one entry and throw
      const count = await db.query(model).count();
      if (count >= 1) {
        throw new Error('Single type entry can only be created once');
      }
    }

    const validData = await entityValidator.validateEntity(db.getModel(model), data);

    let entry = await db.query(model).create(validData);

    if (files) {
      await this.uploadFiles(entry, files, { model });
      entry = await this.findOne({ params: { id: entry.id } }, { model });
    }

    eventHub.emit('entry.create', {
      model: db.getModel(model).modelName,
      entry,
    });

    return entry;
  },

  /**
   * Promise to edit record
   *
   * @return {Promise}
   */

  async update({ params, data, files }, { model }) {
    const validData = await entityValidator.validateEntityUpdate(db.getModel(model), data);

    let entry = await db.query(model).update(params, validData);

    if (files) {
      await this.uploadFiles(entry, files, { model });
      entry = await this.findOne({ params: { id: entry.id } }, { model });
    }

    eventHub.emit('entry.update', {
      model: db.getModel(model).modelName,
      entry,
    });

    return entry;
  },

  /**
   * Promise to delete a record
   *
   * @return {Promise}
   */

  async delete({ params }, { model }) {
    const entry = await db.query(model).delete(params);

    eventHub.emit('entry.delete', {
      model: db.getModel(model).modelName,
      entry,
    });

    return entry;
  },

  /**
   * Promise to search records
   *
   * @return {Promise}
   */

  search({ params }, { model }) {
    return db.query(model).search(params);
  },

  /**
   * Promise to count searched records
   *
   * @return {Promise}
   */
  countSearch({ params }, { model }) {
    return db.query(model).countSearch(params);
  },
});
