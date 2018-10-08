'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const mongoose = require('mongoose');
const Mongoose = mongoose.Mongoose;

module.exports = (mongoose = new Mongoose()) => {
  const Decimal = require('mongoose-float').loadType(mongoose, 2);
  const Float = require('mongoose-float').loadType(mongoose, 20);

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
    valueToId: function (value) {
      return this.isMongoId(value)
        ? mongoose.Types.ObjectId(value)
        : value;
    },
    isMongoId: function (value) {
      // Here we don't use mongoose.Types.ObjectId.isValid method because it's a weird check,
      // it returns for instance true for any integer value ¯\_(ツ)_/¯
      const hexadecimal = /^[0-9A-F]+$/i;
      return hexadecimal.test(value) && value.length === 24;
    }
  };
};
