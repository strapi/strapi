'use strict';

const addSchema = (tableName) => {
  const schemaName = strapi.db.connection.getSchemaName();
  return schemaName ? `${schemaName}.${tableName}` : tableName;
};

module.export = {
  addSchema,
};
