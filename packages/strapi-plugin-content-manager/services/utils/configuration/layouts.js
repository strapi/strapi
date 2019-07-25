'use strict';

const _ = require('lodash');
const {
  isListable,
  isVisible,
  hasEditableAttribute,
  hasRelationAttribute,
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

async function createDefaultLayouts(schema) {
  return {
    list: createDefaultListLayout(schema),
    editRelations: createDefaultEditRelationsLayout(schema),
    edit: createDefaultEditLayout(schema),
  };
}

function createDefaultListLayout(schema) {
  return Object.keys(schema.attributes)
    .filter(name => isListable(schema, name))
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

  return appendToEditLayout([], keys, schema);
}

/** Synchronisation functions */

function syncLayouts(configuration, schema) {
  if (_.isEmpty(configuration.layouts)) return createDefaultLayouts(schema);

  const { list = [], editRelations = [], edit = [] } =
    configuration.layouts || {};

  const cleanList = list.filter(attr => isListable(schema, attr));

  const cleanEditRelations = editRelations.filter(attr =>
    hasRelationAttribute(schema, attr)
  );

  let elementsToReAppend = [];
  let cleanEdit = [];
  for (let row of edit) {
    let newRow = [];

    for (let el of row) {
      if (!hasEditableAttribute(schema, el.name)) continue;

      // if size of the element has changes (type change)
      if (typeToSize(schema.attributes[el.name].type) !== el.size) {
        elementsToReAppend.push(el.name);
        continue;
      }

      newRow.push(el);
    }

    if (newRow.length > 0) {
      cleanEdit.push(newRow);
    }
  }

  cleanEdit = appendToEditLayout(cleanEdit, elementsToReAppend, schema);

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
        .concat(newAttributes.filter(key => isListable(schema, key)))
        .slice(0, DEFAULT_LIST_LENGTH)
    );
  }

  // add new relations to layout
  if (schema.modelType !== 'group') {
    const newRelations = newAttributes.filter(key =>
      hasRelationAttribute(schema, key)
    );

    layout.editRelations = _.uniq(layout.editRelations.concat(newRelations));
  }

  // add new attributes to edit view
  const newEditAttributes = newAttributes.filter(
    key => hasEditableAttribute(schema, key) && isVisible(schema, key)
  );

  layout.edit = appendToEditLayout(layout.edit, newEditAttributes, schema);

  return layout;
}

const appendToEditLayout = (layout = [], keysToAppend, schema) => {
  let currentRowIndex = Math.max(layout.length - 1, 0);

  // init currentRow if necessary
  if (!layout[currentRowIndex]) {
    layout[currentRowIndex] = [];
  }

  for (let key of keysToAppend) {
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
};

module.exports = {
  createDefaultLayouts,
  syncLayouts,
};
