'use strict';

const _ = require('lodash');
const {
  hasListableAttribute,
  hasRelationAttribute,
  hasEditableAttribute,
} = require('./attributes');

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

async function createDefaultLayouts(model) {
  return {
    list: createDefaultListLayout(model),
    editRelations: createDefaultEditRelationsLayout(model),
    edit: createDefaultEditLayout(model),
  };
}

function createDefaultListLayout(model) {
  return ['id']
    .concat(Object.keys(model.allAttributes))
    .filter(name => hasListableAttribute(model, name))
    .slice(0, DEFAULT_LIST_LENGTH);
}

function createDefaultEditRelationsLayout(model) {
  return Object.keys(model.allAttributes).filter(name =>
    hasRelationAttribute(model, name)
  );
}

const rowSize = els => els.reduce((sum, el) => sum + el.size, 0);
function createDefaultEditLayout(model) {
  const keys = Object.keys(model.attributes).filter(name =>
    hasEditableAttribute(model, name)
  );

  let layout = [[]];
  let currentRowIndex = 0;
  for (let key of keys) {
    const attribute = model.attributes[key];
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

function syncLayouts(configuration, model) {
  if (_.isEmpty(configuration.layouts)) return createDefaultLayouts(model);

  const { list = [], editRelations = [], edit = [] } =
    configuration.layouts || {};

  const cleanList = list.filter(attr => hasListableAttribute(model, attr));

  const cleanEditRelations = editRelations.filter(attr =>
    hasRelationAttribute(model, attr)
  );

  const cleanEdit = edit.reduce((acc, row) => {
    let newRow = row.filter(el => hasEditableAttribute(model, el.name));

    if (newRow.length > 0) {
      acc.push(newRow);
    }
    return acc;
  }, []);

  let layout = {
    list: cleanList.length > 0 ? cleanList : createDefaultListLayout(model),
    editRelations:
      cleanEditRelations.length > 0
        ? cleanEditRelations
        : createDefaultEditRelationsLayout(model),
    edit: cleanEdit.length > 0 ? cleanEdit : createDefaultEditLayout(model),
  };

  const newAttributes = _.difference(
    Object.keys(model.allAttributes),
    Object.keys(configuration.metadatas)
  );

  if (newAttributes.length === 0) return layout;

  /** Add new attributes where they belong */

  if (layout.list.length < DEFAULT_LIST_LENGTH) {
    // add newAttributes
    // only add valid listable attributes
    layout.list = _.uniq(
      layout.list
        .concat(newAttributes.filter(key => hasListableAttribute(model, key)))
        .slice(0, DEFAULT_LIST_LENGTH)
    );
  }

  // add new relations to layout
  const newRelations = newAttributes.filter(key =>
    hasRelationAttribute(model, key)
  );

  layout.editRelations = _.uniq(layout.editRelations.concat(newRelations));

  // add new attributes to edit view
  const newEditAttributes = newAttributes.filter(
    key => hasEditableAttribute(model, key) && _.has(model.attributes, key)
  );

  let currentRowIndex = Math.max(layout.edit.length - 1, 0);
  for (let key of newEditAttributes) {
    const attribute = model.attributes[key];
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

module.exports = {
  createDefaultLayouts,
  syncLayouts,
};
