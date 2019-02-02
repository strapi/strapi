const _ = require('lodash');
const getUtils = require('./utils');
const { getAssociationFromField } = require('./query-utils');

const utils = getUtils();

class Converter {
  constructor(model, filter) {
    this.model = model;
    this.query = {
      ...this.buildFilter(filter),
      where: this.buildWhere(filter.where),
    };
  }

  buildFilter(filter) {
    // Remove where from the filter
    const cleanFilter = _.omit(filter, 'where');
    return _.omitBy({
      ...cleanFilter,
      sort: _.isPlainObject(cleanFilter.sort)
        ? `${cleanFilter.sort.order === 'desc' ? '-' : ''}${cleanFilter.sort.key}`
        : undefined
    }, _.isUndefined);
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
      // Case of an operation value
      if (_.isPlainObject(value)) {
        operation = _.keys(value)[0];
        value = value[operation];
      }

      const fieldId = this.getFieldId(key, value, operation);

      if (operation) {
        if (operation === 'between') {
          query[fieldId] = {
            $gte: value[0],
            $lte: value[1]
          };
        } else if (operation === 'in' || operation === 'nin') {
          query[fieldId] = {
            [`$${operation}`]: _.castArray(value).map(utils.valueToId),
          };
        } else if (operation === 'contains') {
          query[fieldId] = { $regex: new RegExp(value), $options: 'i' };
        } else if (operation === 'containss') {
          query[fieldId] = { $regex: new RegExp(value) };
        } else {
          query[fieldId] = {
            [`$${operation}`]: utils.valueToId(value),
          };
        }
      } else {
        query[fieldId] = utils.valueToId(value);
      }
    });

    return query;
  }

  /**
   * This function is used to suffix an association field with its primaryKey
   * so that it works with the new population system.
   *
   * @example
   * Get me all users that have administrator role (id: '5af470063af04c75f7e91db3')
   * where = {
   *   role: '5af470063af04c75f7e91db3'
   * }
   *
   * // => {
   *  role.id: '5af470063af04c75f7e91db3'
   * }
   *
   */
  getFieldId(fieldId, value, operation = 'eq') {
    const { association, model } = getAssociationFromField(this.model, fieldId);
    const shouldFieldBeSuffixed =
      association &&
      !_.endsWith(fieldId, model.primaryKey) && (
        ['in', 'nin'].includes(operation) || // When using in or nin operators we want to apply the filter on the relation's primary key and not the relation itself
      (['eq', 'ne'].includes(operation) && utils.isMongoId(value)) // Only suffix the field if the operators are eq or ne and the value is a valid mongo id
      );

    if (shouldFieldBeSuffixed) {
      return `${fieldId}.${model.primaryKey}`;
    }

    return fieldId;
  }

  convert() {
    return this.query;
  }
}

module.exports = {
  Converter
};
