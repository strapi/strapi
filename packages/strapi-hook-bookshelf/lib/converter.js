const _ = require('lodash');

class Converter {
  constructor(model, filter) {
    this.model = model;
    this.query = {
      ..._.omit(filter, 'where'),
      where: this.buildWhere(filter.where),
    };
  }

  operationToSymbol(operation) {
    switch(operation) {
      case 'eq': return '=';
      case 'ne': return '!=';
      case 'lt': return '<';
      case 'lte': return '<=';
      case 'gt': return '>';
      case 'gte': return '>=';
      case 'contains':
      case 'containss': return 'like';
      case 'in': return 'IN';
      case 'nin': return 'NOT IN';
      default: operation;
    }
  }

  buildWhere(where) {
    let query = {};
    _.forEach(where, (_value, key) => {
      // To make sure that the value is not mutated
      let value = _.cloneDeep(_value);
      if (key === 'and' || key === 'or') {
        if (_.isArray(value)) {
          value = _.map(value, (innerWhere) => this.buildWhere(innerWhere));
        }
        query[`$${key}`] = value;
        delete query[key];
        return;
      }

      let operation;
      let symbol;
      let method = 'where';
      // Case of an operation value
      if (_.isPlainObject(value)) {
        operation = _.keys(value)[0];
        symbol = this.operationToSymbol(operation);
        value = value[operation];
      }

      if (operation) {
        if (operation === 'between') {
          query[key] = {
            method: 'whereBetween',
            value: _.castArray(value),
          };
        } else if (operation === 'in') {
          query[key] = {
            method: 'whereIn',
            value: _.castArray(value),
          };
        } else if (operation === 'nin') {
          query[key] = {
            method: 'whereNotIn',
            value: _.castArray(value),
          };
        } else if (operation === 'contains' || operation === 'containss') {
          query[key] = {
            method,
            symbol,
            value: `%${value}%`,
          };
        } else if (operation === 'exists') {
          query[key] = {
            method: value ? 'whereNotNull' : 'whereNull',
          };
        } else {
          query[key] = {
            method,
            symbol,
            value
          };
        }
      } else {
        if (value === null) {
          query[key] = {
            method: 'whereNull',
          };
        } else {
          query[key] = {
            method,
            symbol: '=',
            value
          };
        }
      }

    });

    return query;
  }

  convert() {
    return this.query;
  }

}

module.exports = {
  Converter
};
