const types = {
  UUID: 'uuid',
  TEXT: 'text',
  JSON: 'json',
  STRING: 'string',
  ENUM: 'enumeration',
  PASSWORD: 'password',
  EMAIL: 'email',
  INTEGER: 'integer',
  BIGINTEGER: 'biginteger',
  FLOAT: 'float',
  DECIMAL: 'decimal',
  DATE: 'date',
  TIME: 'time',
  DATETIME: 'datetime',
  TIMESTAMP: 'timestamp',
  BOOLEAN: 'boolean',
};

const typesArray = Object.values(types);

module.exports = {
  types,
  typesArray,
};
