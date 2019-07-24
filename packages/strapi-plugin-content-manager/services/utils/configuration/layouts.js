'use strict';

const _ = require('lodash');
const { isSortable, isVisible, isRelation } = require('./attributes');

const DEFAULT_LIST_LENGTH = 4;
const MAX_ROW_SIZE = 12;

const typeToSize = type => {
  switch (type) {
    case 'checkbox':
    case 'boolean':
    case 'date':
    case 'biginteger':
    case 'decimal':
    case 'float':
    case 'integer':
    case 'number':
      return MAX_ROW_SIZE / 3;
    case 'json':
    case 'group':
    case 'wysiwyg':
      return MAX_ROW_SIZE;

    default:
      return MAX_ROW_SIZE / 2;
  }
};

async function createDefaultLayouts(schema) {
  return {
    list: createDefaultListLayout(schema),
    editRelations: createDefaultEditRelationsLayout(schema),
    edit: createDefaultEditLayout(schema),
  };
}

function createDefaultListLayout(schema) {
  return Object.keys(schema.attributes)
    .filter(name => isSortable(schema, name))
    .slice(0, DEFAULT_LIST_LENGTH);
}

function createDefaultEditRelationsLayout(schema) {
  if (schema.modelType === 'group') return [];

  return Object.keys(schema.attributes).filter(name =>
    hasRelationAttribute(schema, name)
  );
}

const rowSize = els => els.reduce((sum, el) => sum + el.size, 0);

function createDefaultEditLayout(schema) {
  const keys = Object.keys(schema.attributes).filter(name =>
    hasEditableAttribute(schema, name)
  );

  let layout = [[]];
  let currentRowIndex = 0;
  for (let key of keys) {
    const attribute = schema.attributes[key];
    const attributeSize = typeToSize(attribute.type);
    let currenRowSize = rowSize(layout[currentRowIndex]);

    if (currenRowSize + attributeSize > MAX_ROW_SIZE) {
      currentRowIndex += 1;
      layout[currentRowIndex] = [];
    }

    layout[currentRowIndex].push({
      name: key,
      size: attributeSize,
    });
  }

  return layout;
}

/** Synchronisation functions */

function syncLayouts(configuration, schema) {
  if (_.isEmpty(configuration.layouts)) return createDefaultLayouts(schema);

  const { list = [], editRelations = [], edit = [] } =
    configuration.layouts || {};

  const cleanList = list.filter(attr => isSortable(schema, attr));

  const cleanEditRelations = editRelations.filter(attr =>
    hasRelationAttribute(schema, attr)
  );

  const cleanEdit = edit.reduce((acc, row) => {
    let newRow = row.filter(el => hasEditableAttribute(schema, el.name));

    // TODO: recompute row sizes

    if (newRow.length > 0) {
      acc.push(newRow);
    }
    return acc;
  }, []);

  let layout = {
    list: cleanList.length > 0 ? cleanList : createDefaultListLayout(schema),
    editRelations:
      cleanEditRelations.length > 0
        ? cleanEditRelations
        : createDefaultEditRelationsLayout(schema),
    edit: cleanEdit.length > 0 ? cleanEdit : createDefaultEditLayout(schema),
  };

  const newAttributes = _.difference(
    Object.keys(schema.attributes),
    Object.keys(configuration.metadatas)
  );

  if (newAttributes.length === 0) return layout;

  /** Add new attributes where they belong */

  if (layout.list.length < DEFAULT_LIST_LENGTH) {
    // add newAttributes
    // only add valid listable attributes
    layout.list = _.uniq(
      layout.list
        .concat(newAttributes.filter(key => isSortable(schema, key)))
        .slice(0, DEFAULT_LIST_LENGTH)
    );
  }

  // add new relations to layout
  if (schema.type !== 'group') {
    const newRelations = newAttributes.filter(key =>
      hasRelationAttribute(schema, key)
    );

    layout.editRelations = _.uniq(layout.editRelations.concat(newRelations));
  }

  // add new attributes to edit view
  const newEditAttributes = newAttributes.filter(
    key => hasEditableAttribute(schema, key) && isVisible(schema, key)
  );

  let currentRowIndex = Math.max(layout.edit.length - 1, 0);
  for (let key of newEditAttributes) {
    const attribute = schema.attributes[key];
    const attributeSize = typeToSize(attribute.type);
    let currenRowSize = rowSize(layout.edit[currentRowIndex]);

    if (currenRowSize + attributeSize > MAX_ROW_SIZE) {
      currentRowIndex += 1;
      layout.edit[currentRowIndex] = [];
    }

    layout.edit[currentRowIndex].push({
      name: key,
      size: attributeSize,
    });
  }

  return layout;
}

const hasRelationAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  return isRelation(schema.attributes[name]);
};

const hasEditableAttribute = (schema, name) => {
  if (!_.has(schema.attributes, name)) {
    return false;
  }

  if (!isVisible(schema, name)) {
    return false;
  }

  if (isRelation(schema.attributes[name])) {
    if (schema.modelType === 'group') return true;
    return false;
  }

  return true;
};

module.exports = {
  createDefaultLayouts,
  syncLayouts,
};
