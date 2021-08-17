'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createField } = require('../../fields');

const fromRow = (metadata, row) => {
  if (Array.isArray(row)) {
    return row.map(singleRow => fromRow(metadata, singleRow));
  }

  const { attributes } = metadata;

  if (_.isNil(row)) {
    return null;
  }

  const obj = {};

  for (const column in row) {
    // to field Name
    const attributeName = column;

    if (!attributes[attributeName]) {
      // ignore value that are not related to an attribute (join columns ...)
      continue;
    }

    const attribute = attributes[attributeName];

    if (types.isScalar(attribute.type)) {
      // TODO: we convert to column name
      // TODO: handle default value too
      // TODO: format data & use dialect to know which type they support (json particularly)

      const field = createField(attribute);

      // TODO: validate data on creation
      // field.validate(data[attributeName]);
      const val = row[column] === null ? null : field.fromDB(row[column]);

      obj[attributeName] = val;
    }

    if (types.isRelation(attribute.type)) {
      obj[attributeName] = row[column];
    }
  }

  return obj;
};

module.exports = {
  fromRow,
};
