const _ = require('lodash');

const getFilterKey = key => {
  const matched = key.match(/^_?(sort|limit|start|skip)$/);
  if (matched) {
    return matched[1];
  }
  return null;
};

const getOperatorKey = key => {
  const matched = key.match(/(.*)_(neq?|lte?|gte?|containss?|n?in|exists)$/);
  if (matched) {
    return matched.slice(1);
  }
  return [key, 'eq'];
};

class Builder {
  constructor(model, filter) {
    // Initialize Model
    this.model = model;
    // Initialize the default filter options
    this.filter = {
      start: 0,
      where: {},
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
        this[filterKey]([value]);
      } else {
        const [field, operation] = getOperatorKey(key);

        if (this.isValidFieldId(field)) {
          this[operation]([field, value]);
        } else {
          strapi.log.warn(
            `Your filter: ${JSON.stringify(
              filter,
              null,
              2
            )} contains a field "${field}" that doesn't appear neither on your model definition nor in the basic filter operators,
            This field will be ignored for now.`
          );
        }
      }
    }
  }

  isValidFieldId(fieldId) {
    let model = this.model;
    const fieldParts = fieldId.split('.');
    const fieldPartsSize = fieldParts.length;
    return _.every(fieldParts, (fieldPart, index) => {
      const fieldIdx = index + 1;
      const isAttribute = !!model.attributes[fieldPart] || model.primaryKey === fieldPart;
      const association = model.associations.find(ast => ast.alias === fieldPart);
      const isAssociation = !!association;
      if (fieldIdx < fieldPartsSize) {
        if (isAssociation) {
          const { models } = association.plugin ? strapi.plugins[association.plugin] : strapi;
          model = models[association.collection || association.model];
          return true;
        }
      } else if (fieldIdx === fieldPartsSize) {
        if (isAttribute || isAssociation) {
          return true;
        }
      }
      return false;
    });
  }

  sort(sort) {
    const [key, order = 'ASC'] = _.isString(sort) ? sort.split(':') : sort;

    this.filter.sort = {
      order: order.toLowerCase(),
      key,
    };
  }

  limit(limit) {
    const _limit = _.toNumber(limit);
    // If the limit is explicitly set to -1, then don't apply a limit
    if (_limit === -1) {
      delete this.filter.limit;
    } else {
      this.filter.limit = _limit;
    }

    return this;
  }

  start(start) {
    this.filter.start = _.toNumber(start);
    return this;
  }

  /**
   * This is just an alias for start, it'll be deprecated in the future.
   */
  skip(start) {
    return this.start(start);
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
      ...w,
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
  Builder,
  getFilterKey,
  getOperatorKey,
};
