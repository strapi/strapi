const createTable = ({ collectionName, attributes }, { knex, client }) => {
  return knex.schema.createTable(collectionName, table => {
    const createCol = createColumn({ table, client });
    // create every columns
    Object.keys(attributes).forEach(name => {
      const attribute = attributes[name];
      const { unique, default: defaultValue, required } = attribute;

      const col = createCol({ name, ...attribute });

      // apply required
      if (required === true) col.notNullable();
      // apply defaultValue
      if (defaultValue !== undefined) col.defaultTo(knex.raw(defaultValue));
      // apply unique constraint
      if (unique === true) table.unique(name);
    });
  });
};

const createColumn = ({ table, client }) => attribute => {
  const { name, type } = attribute;

  switch (type) {
    case 'specificType':
      return table.specificType(name, attribute.specificType);
    case 'uuid':
      return table.uuid(name);
    case 'text':
      return table.text(name);
    // return client === 'pg' ? 'text' : 'longtext';
    case 'json':
      return table.jsonb(name);
    // return client === 'pg' ? 'jsonb' : 'longtext';
    case 'enumeration':
    case 'string':
    case 'password':
    case 'email':
      // TODO: add optional length;
      return table.string(name);
    // return 'varchar(255)';
    case 'integer':
      // TODO: support unsigned
      return table.integer(name);
    // return client === 'pg' ? 'integer' : 'int';
    case 'biginteger':
      return table.bigInteger(name);
    // return client === 'pg' ? 'bigint' : 'bigint(53)';
    case 'float':
      // TODO: support precision and scale
      return table.float(name);
    // return client === 'pg' ? 'double precision' : 'double';
    case 'decimal':
      // TODO: support precision and scale
      // return 'decimal(10,2)';
      return table.decimal(name);
    case 'date':
      return table.date(name);
    case 'time':
      // TODO: support precision for mysql
      return table.time(name);
    case 'datetime':
      // support precision
      return table.datetime(name);
    case 'timestamp':
      // TODO: support precision for mysql  and useTz
      return table.timestamp(name);
    // if (client === 'pg') {
    //   return 'timestamp with time zone';
    // } else if (client === 'sqlite3' && tableExists) {
    //   return 'timestamp DEFAULT NULL';
    // }
    // return 'timestamp DEFAULT CURRENT_TIMESTAMP';
    case 'timestampUpdate':
      switch (client) {
        case 'pg':
          return table.specificType(name, 'timestamp with time zone');
        case 'sqlite3':
          return table.specificType(
            name,
            'timestamp DEFAULT CURRENT_TIMESTAMP'
          );
        default:
          return table.specificType(
            name,
            'timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
          );
      }
    case 'binary':
      // TODO: handle length for mysql
      return table.binary(name);
    case 'boolean':
      return table.boolean(name);
    default:
      throw new Error(`Unsupported type ${type} for attrbiute ${name}`);
  }
};

module.exports = createTable;
