'use strict';

module.exports = function createQuery(opts) {
  return new Query(opts);
};

class Query {
  constructor({ model, connectorQuery, eventHub }) {
    this.eventHub = eventHub;
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
    const entry = await this.connectorQuery.create(...args);
    this.eventHub.emit('entry.create', entry);
    return entry;
  }

  async update(...args) {
    const entry = await this.connectorQuery.update(...args);
    this.eventHub.emit('entry.update', entry);
    return entry;
  }

  async delete(...args) {
    const entry = await this.connectorQuery.delete(...args);
    this.eventHub.emit('entry.delete', entry);
    return entry;
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
