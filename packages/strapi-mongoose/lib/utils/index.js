'use strict';

/**
 * Module dependencies
 */

module.exports = mongoose => {
  require('mongoose-double')(mongoose);
  require('mongoose-float').loadType(mongoose);

  const SchemaTypes = mongoose.Schema.Types;

  return {
    convertType: mongooseType => {
      switch (mongooseType.toLowerCase()) {
        case 'string':
        case 'text':
          return 'String';
        case 'integer':
        case 'biginteger':
          return 'Number';
        case 'float':
          return SchemaTypes.Float;
        case 'decimal':
          return SchemaTypes.Double;
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
