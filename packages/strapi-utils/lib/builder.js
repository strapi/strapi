const _ = require('lodash');

const getFilterKey = (key) => {
  const matched = key.match(/^_?(sort|limit|start)$/);
  if (matched) {
    return matched[1];
  }
  return null;
};

const getOperatorKey = (key) => {
  const matched = key.match(/(.*)_(neq?|lte?|gte?|containss?|n?in|exists)$/);
  if (matched) {
    return matched.slice(1);
  }
  return null;
};

class Builder {
  constructor(model, filter) {
    // Initialize Model
    this.model = model;
    // Initialize the default filter options
    this.filter = {
      limit: 100,
      start: 0,
      where: {}
    };

    if (!_.isEmpty(filter)) {
      this.parse(filter);
    }
  }

  parse(filter) {
    for (const key of _.keys(filter)) {
      const value = filter[key];

      // Check if the key is a filter key
      const filterKey = getFilterKey(key);
      if (filterKey) {
        this[filterKey].apply(this, [value]);
      } else {
        const matched = getOperatorKey(key);
        let field = key;
        let operation = 'eq';
        if (matched) {
          [field, operation] = matched;
        }
        this[operation].apply(this, [field, value]);
      }
    }
  }

  sort(sort) {
    const [key, order = 'ASC'] = _.isString(sort) ? sort.split(':') : sort;

    this.filter.sort = {
      order: order.toLowerCase(),
      key,
    };
  }

  limit(limit) {
    this.filter.limit = _.toNumber(limit);
  }

  start(start) {
    this.filter.start = _.toNumber(start);
  }

  add(w) {
    for (const k of _.keys(w)) {
      if (k in this.filter.where) {
        // Found conflicting keys, create an `and` operator to join the existing
        // conditions with the new one
        const where = {};
        where.and = [this.filter.where, w];
        this.filter.where = where;
        return this;
      }
    }
    // Merge the where items
    this.filter.where = {
      ...this.filter.where,
      ...w
    };
    return this;
  }

  eq(key, value) {
    const w = {};
    w[key] = value;
    return this.add(w);
  }

  neq(key, value) {
    const w = {};
    w[key] = { ne: value };
    return this.add(w);
  }

  ne(key, value) {
    // This method needs to be deprecated in favor of neq
    return this.neq(key, value);
  }

  exists(key, value) {
    const w = {};
    w[key] = { exists: value };
    return this.add(w);
  }

  in(key, value) {
    const w = {};
    w[key] = { in: value };
    return this.add(w);
  }

  nin(key, value) {
    const w = {};
    w[key] = { nin: value };
    return this.add(w);
  }

  contains(key, value) {
    const w = {};
    w[key] = {
      contains: value,
    };
    return this.add(w);
  }

  containss(key, value) {
    const w = {};
    w[key] = {
      containss: value,
    };
    return this.add(w);
  }

  startsWith(key, value) {
    const w = {};
    w[key] = { startsWith: value };
    return this.add(w);
  }

  endsWith(key, value) {
    const w = {};
    w[key] = { endsWith: value };
    return this.add(w);
  }

  gt(key, value) {
    const w = {};
    w[key] = { gt: value };
    return this.add(w);
  }

  gte(key, value) {
    const w = {};
    w[key] = { gte: value };
    return this.add(w);
  }

  lt(key, value) {
    const w = {};
    w[key] = { lt: value };
    return this.add(w);
  }

  /**
   * Implements <= operation
   * @param {string} key field id
   * @param {number} value its value
   */
  lte(key, value) {
    const w = {};
    w[key] = { lte: value };
    return this.add(w);
  }

  convert() {
    const hook = strapi.hook[this.model.orm];
    const { Converter } = hook.load();

    return new Converter(this.model, this.filter).convert();
  }

  build() {
    return this.filter;
  }
}

module.exports = {
  Builder
};
