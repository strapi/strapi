'use strict';

const { replaceIdByPrimaryKey } = require('../utils/primary-key');

module.exports = function createQuery(opts) {
  return new Query(opts);
};

class Query {
  constructor({ model, connectorQuery }) {
    this.connectorQuery = connectorQuery;
    this.model = model;
  }

  get orm() {
    return this.model.orm;
  }

  get primaryKey() {
    return this.model.primaryKey;
  }

  get associations() {
    return this.model.associations;
  }

  /**
   * Run custom database logic
   */
  custom(mapping) {
    if (typeof mapping === 'function') {
      return mapping.bind(this, { model: this.model });
    }

    if (!mapping[this.orm]) {
      throw new Error(`Missing mapping for orm ${this.orm}`);
    }

    if (typeof mapping[this.orm] !== 'function') {
      throw new Error(`Custom queries must be functions received ${typeof mapping[this.orm]}`);
    }

    return mapping[this.model.orm].call(this, { model: this.model });
  }

  find(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.find(newParams, ...args);
  }

  findOne(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.findOne(newParams, ...args);
  }

  create(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.create(newParams, ...args);
  }

  update(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.update(newParams, ...args);
  }

  delete(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.delete(newParams, ...args);
  }

  count(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.count(newParams, ...args);
  }

  search(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.search(newParams, ...args);
  }

  countSearch(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);
    return this.connectorQuery.countSearch(newParams, ...args);
  }
}
