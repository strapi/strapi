'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');

module.exports = (mongoose) => {
  const Decimal = require('mongoose-double').loadType(mongoose);
  const Float = require('mongoose-float').loadType(mongoose);

  return {
    convertType: (mongooseType) => {
      switch (mongooseType.toLowerCase()) {
        case 'string':
        case 'text':
          return 'String';
        case 'integer':
        case 'biginteger':
          return 'Number'
        case 'float':
          return Float;
        case 'decimal':
          return Decimal;
        case 'date':
        case 'time':
        case 'datetime':
        case 'timestamp':
          return Date;
        case 'boolean':
          return 'Boolean'
        case 'binary':
          return 'Buffer';
        case 'uuid':
          return 'ObjectId';
        case 'enumeration':
          return 'String';
        case 'json':
          return 'Mixed';
        default:

      }
    }
  }
}
