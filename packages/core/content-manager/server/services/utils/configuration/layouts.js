'use strict';

const _ = require('lodash');
const { getService } = require('../../../utils');
const { isListable, hasEditableAttribute, hasRelationAttribute } = require('./attributes');

const DEFAULT_LIST_LENGTH = 4;
const MAX_ROW_SIZE = 12;

const isAllowedFieldSize = (type, size) => {
  const { getFieldSize } = getService('field-sizes');
  const fieldSize = getFieldSize(type);

  // Check if field was locked to another size
  if (!fieldSize.isResizable && size !== fieldSize.default) {
    return false;
  }

  // Otherwise allow unless it's bigger than a row
  return size <= MAX_ROW_SIZE;
};

const getDefaultFieldSize = (attribute) => {
  // Check if it's a custom field with a custom size
  if (attribute.customField) {
    const customField = strapi.container.get('custom-fields').get(attribute.customField);
    if (customField.inputSize) {
      return customField.inputSize.default;
    }
  }

  // Get the default size for the field type
  const { getFieldSize } = getService('field-sizes');
  return getFieldSize(attribute.type).default;
};

async function createDefaultLayouts(schema) {
  return {
    list: createDefaultListLayout(schema),
    edit: createDefaultEditLayout(schema),
    ..._.pick(_.get(schema, ['config', 'layouts'], {}), ['list', 'edit']),
  };
}

function createDefaultListLayout(schema) {
  return Object.keys(schema.attributes)
    .filter((name) => isListable(schema, name))
    .slice(0, DEFAULT_LIST_LENGTH);
}

const rowSize = (els) => els.reduce((sum, el) => sum + el.size, 0);

function createDefaultEditLayout(schema) {
  const keys = Object.keys(schema.attributes).filter((name) => hasEditableAttribute(schema, name));

  return appendToEditLayout([], keys, schema);
}

/** Synchronisation functions */

function syncLayouts(configuration, schema) {
  if (_.isEmpty(configuration.layouts)) return createDefaultLayouts(schema);

  const { list = [], editRelations = [], edit = [] } = configuration.layouts || {};

  let cleanList = list.filter((attr) => isListable(schema, attr));

  // TODO V5: remove editRelations
  const cleanEditRelations = editRelations.filter((attr) => hasRelationAttribute(schema, attr));

  // backward compatibility with when relations were on the side of the layout
  // it migrates the displayed relations to the main edit layout
  const elementsToReAppend = [...cleanEditRelations];
  let cleanEdit = [];
  for (const row of edit) {
    const newRow = [];

    for (const el of row) {
      if (!hasEditableAttribute(schema, el.name)) continue;

      /* if the type of a field was changed (ex: string -> json) or a new field was added in the schema
         and the new type doesn't allow the size of the previous type, append the field at the end of layouts
      */
      if (!isAllowedFieldSize(schema.attributes[el.name].type, el.size)) {
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

  const newAttributes = _.difference(
    Object.keys(schema.attributes),
    Object.keys(configuration.metadatas)
  );

  /** Add new attributes where they belong */

  if (cleanList.length < DEFAULT_LIST_LENGTH) {
    // add newAttributes
    // only add valid listable attributes
    cleanList = _.uniq(
      cleanList
        .concat(newAttributes.filter((key) => isListable(schema, key)))
        .slice(0, DEFAULT_LIST_LENGTH)
    );
  }

  // add new attributes to edit view
  const newEditAttributes = newAttributes.filter((key) => hasEditableAttribute(schema, key));

  cleanEdit = appendToEditLayout(cleanEdit, newEditAttributes, schema);

  return {
    list: cleanList.length > 0 ? cleanList : createDefaultListLayout(schema),
    edit: cleanEdit.length > 0 ? cleanEdit : createDefaultEditLayout(schema),
  };
}

const appendToEditLayout = (layout = [], keysToAppend, schema) => {
  if (keysToAppend.length === 0) return layout;
  let currentRowIndex = Math.max(layout.length - 1, 0);

  // init currentRow if necessary
  if (!layout[currentRowIndex]) {
    layout[currentRowIndex] = [];
  }

  for (const key of keysToAppend) {
    const attribute = schema.attributes[key];

    const attributeSize = getDefaultFieldSize(attribute);
    const currenRowSize = rowSize(layout[currentRowIndex]);

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
