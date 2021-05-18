'use strict';

// simple example
const dialects = {
  pg: {
    fields: {
      string: 'varchar',
    },
  },
  sqlite: {
    fields: {
      string: 'text',
    },
  },
};

const FIELDS = {
  string: {
    defaultColumnType: 'varchar',
    // before write
    parser: a => a,
    // after read
    formatter: a => a,
    // before write
    validator: a => a,
  },
};

module.exports = {
  get(type) {
    if (!(type in FIELDS)) {
      throw new Error(`Unknow field ${type}`);
    }

    return FIELDS[type];
  },
};
