'use strict';

/**
 * Module dependencies
 */

module.exports = mongoose => {
  require('mongoose-float').loadType(mongoose);

  const SchemaTypes = mongoose.Schema.Types;

  SchemaTypes.Decimal.prototype.cast = function (value) {
    return value.toString();
  };

  return {
    convertType: mongooseType => {
      switch (mongooseType.toLowerCase()) {
        case 'string':
        case 'password':
        case 'text':
        case 'email':
          return 'String';
        case 'integer':
        case 'biginteger':
          return 'Number';
        case 'float':
          return 'Float';
        case 'decimal':
          return 'Decimal';
        case 'date':
        case 'time':
        case 'datetime':
        case 'timestamp':
          return Date;
        case 'boolean':
          return 'Boolean';
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
  };
};
