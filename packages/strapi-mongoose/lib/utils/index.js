'use strict';

/**
 * Module dependencies
 */

module.exports = mongoose => {
  require('mongoose-float').loadType(mongoose);

  const SchemaTypes = mongoose.Schema.Types;

  // Note: The decimal format isn't well supported by MongoDB.
  // It's recommended to use Float or Number type instead.
  //
  // SchemaTypes.Decimal.prototype.cast = function (value) {
  //   return value.toString();
  // };

  return {
    convertType: mongooseType => {
      switch (mongooseType.toLowerCase()) {
        case 'array':
          return 'Array';
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
        case 'float':
          return 'Float';
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
    }
  };
};
