'use strict';

/**
 * Module dependencies
 */

module.exports = mongoose => {
  var Decimal = require('mongoose-float').loadType(mongoose, 2);
  var Float = require('mongoose-float').loadType(mongoose, 20);

  return {
    convertType: mongooseType => {
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
          return Decimal;
        case 'float':
          return Float;
        case 'json':
          return 'Mixed';
        case 'biginteger':
        case 'integer':
          return 'Number';
        case 'uuid':
          return 'ObjectId';
        case 'email':
        case 'enumeration':
        case 'password':
        case 'string':
        case 'text':
          return 'String';
        default:
      }
    },
  };
};
