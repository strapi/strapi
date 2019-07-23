'use strict';

const _ = require('lodash');
const {
  isEditable,
  isSortable,
  hasListableAttribute,
} = require('./attributes');

function createDefaultMetadatas(model) {
  return {
    id: {
      edit: {},
      list: {
        label: 'Id',
        searchable: true,
        sortable: true,
      },
    },
    ...Object.keys(model.allAttributes).reduce((acc, name) => {
      acc[name] = createDefaultMetadata(model, name);
      return acc;
    }, {}),
  };
}

function createDefaultMetadata(model, name) {
  const attr = model.allAttributes[name];
  const edit = {
    label: name,
    description: '',
    placeholder: '',
    visible: true,
    editable: isEditable(model, name),
  };

  if (_.has(attr, 'model') || _.has(attr, 'collection')) {
    edit.mainField = 'id';
  }

  const list = {
    label: name,
    searchable: true,
    sortable: isSortable(model, name),
  };

  return { edit, list };
}

/** Synchronisation functions */

async function syncMetadatas(configuration, model) {
  // clear all keys that do not exist anymore
  if (_.isEmpty(configuration.metadatas)) return createDefaultMetadatas(model);

  // remove old keys
  const metasWithValidKeys = _.pick(
    configuration.metadatas,
    ['id'].concat(Object.keys(model.allAttributes))
  );

  // add new keys and missing fields
  const metasWithDefaults = _.merge(
    {},
    createDefaultMetadatas(model),
    metasWithValidKeys
  );

  // clear the invalid mainFields
  const updatedMetas = Object.keys(metasWithDefaults).reduce((acc, key) => {
    const meta = metasWithDefaults[key];
    const { edit, list } = meta;

    let updatedMeta = { edit, list };
    // update sortable attr
    if (list.sortable && !isSortable(model, key)) {
      _.set(updatedMeta, ['list', 'sortable'], false);
      _.set(acc, [key], updatedMeta);
    }

    if (!_.has(edit, 'mainField')) return acc;

    // remove mainField if the attribute is not a relation anymore
    if (_.has(model.allAttributes[key], 'type')) {
      _.set(updatedMeta, 'edit', _.omit(edit, ['mainField']));
      _.set(acc, [key], updatedMeta);
      return acc;
    }

    // if the mainField is id you can keep it
    if (edit.mainField === 'id') return acc;

    // check the mainField in the targetModel
    const attr = model.allAttributes[key];
    const target = strapi.getModel(attr.model || attr.collection, attr.plugin);

    if (!hasListableAttribute(target, meta.mainField)) {
      _.set(updatedMeta, ['edit', 'mainField'], 'id');
      _.set(acc, [key], updatedMeta);
      return acc;
    }

    return acc;
  }, {});

  return _.assign(metasWithDefaults, updatedMetas);
}

module.exports = {
  createDefaultMetadatas,
  syncMetadatas,
};
