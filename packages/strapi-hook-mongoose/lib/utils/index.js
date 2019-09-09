'use strict';

const _ = require('lodash');
const Mongoose = require('mongoose');

/**
 * Module dependencies
 */

module.exports = (mongoose = Mongoose) => {
  mongoose.Schema.Types.Decimal = require('mongoose-float').loadType(
    mongoose,
    2
  );
  mongoose.Schema.Types.Float = require('mongoose-float').loadType(
    mongoose,
    20
  );

  /**
   * Convert MongoDB ID to the stringify version as GraphQL throws an error if not.
   *
   * Refer to: https://github.com/graphql/graphql-js/commit/3521e1429eec7eabeee4da65c93306b51308727b#diff-87c5e74dd1f7d923143e0eee611f598eR183
   */
  mongoose.Types.ObjectId.prototype.valueOf = function() {
    return this.toString();
  };

  const convertType = mongooseType => {
    switch (mongooseType.toLowerCase()) {
      case 'array':
        return Array;
      case 'boolean':
        return 'Boolean';
      case 'binary':
        return 'Buffer';
      case 'date':
      case 'datetime':
      case 'time':
      case 'timestamp':
        return Date;
      case 'decimal':
        return 'Decimal';
      case 'float':
        return 'Float';
      case 'json':
        return 'Mixed';
      case 'biginteger':
        return 'Long';
      case 'integer':
        return 'Number';
      case 'uuid':
        return 'ObjectId';
      case 'email':
      case 'enumeration':
      case 'password':
      case 'string':
      case 'text':
      case 'richtext':
        return 'String';
      default:
        return undefined;
    }
  };

  const isMongoId = value => {
    if (value instanceof mongoose.Types.ObjectId) {
      return true;
    }

    if (!_.isString(value)) {
      return false;
    }

    // Here we don't use mongoose.Types.ObjectId.isValid method because it's a weird check,
    // it returns for instance true for any integer value
    const hexadecimal = /^[0-9A-F]+$/i;
    return hexadecimal.test(value) && value.length === 24;
  };

  const valueToId = value => {
    if (isMongoId(value)) {
      return mongoose.Types.ObjectId(value);
    }

    return value;
  };

  return {
    convertType,
    valueToId,
    isMongoId,
  };
};
