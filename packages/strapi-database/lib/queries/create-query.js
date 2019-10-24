'use strict';

module.exports = function createQuery({ connectorQuery, model }) {
  return new Query(connectorQuery, model);
};

class Query {
  constructor(connectorQuery, model) {
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
      throw new Error(
        `Custom queries must be functions received ${typeof mapping[this.orm]}`
      );
    }

    return mapping[this.model.orm].call(this, { model: this.model });
  }

  async find(...args) {
    return this.connectorQuery.find(...args);
  }

  async findOne(...args) {
    return this.connectorQuery.findOne(...args);
  }

  async create(...args) {
    return this.connectorQuery.create(...args);
  }

  async update(...args) {
    return this.connectorQuery.update(...args);
  }

  async delete(...args) {
    return this.connectorQuery.delete(...args);
  }

  async count(...args) {
    return this.connectorQuery.count(...args);
  }

  async search(...args) {
    return this.connectorQuery.search(...args);
  }

  async countSearch(...args) {
    return this.connectorQuery.countSearch(...args);
  }
}
