'use strict';

const _ = require('lodash');

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

  async executeHook(hook, ...args) {
    if (_.has(this.model, hook)) {
      await this.model[hook](...args);
    }
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

  async find(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeFetchAll', newParams, ...args);
    const results = await this.connectorQuery.find(newParams, ...args);
    await this.executeHook('afterFetchAll', results);

    return results;
  }

  async findOne(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeFetch', newParams, ...args);
    const result = await this.connectorQuery.findOne(newParams, ...args);
    await this.executeHook('afterFetch', result);

    return result;
  }

  async create(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeCreate', newParams, ...args);
    const entry = await this.connectorQuery.create(newParams, ...args);
    await this.executeHook('afterCreate', entry);

    return entry;
  }

  async update(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeUpdate', newParams, ...args);
    const entry = await this.connectorQuery.update(newParams, ...args);
    await this.executeHook('afterUpdate', entry);

    return entry;
  }

  async delete(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeDestroy', newParams, ...args);
    const entry = await this.connectorQuery.delete(newParams, ...args);
    await this.executeHook('afterDestroy', entry);

    return entry;
  }

  async count(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeCount', newParams, ...args);
    const count = await this.connectorQuery.count(newParams, ...args);
    await this.executeHook('afterCount', count);

    return count;
  }

  async search(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeSearch', newParams, ...args);
    const results = await this.connectorQuery.search(newParams, ...args);
    await this.executeHook('afterSearch', results);

    return results;
  }

  async countSearch(params = {}, ...args) {
    const newParams = replaceIdByPrimaryKey(params, this.model);

    await this.executeHook('beforeCountSearch', newParams, ...args);
    const count = await this.connectorQuery.countSearch(newParams, ...args);
    await this.executeHook('afterCountSearch', count);

    return count;
  }
}
