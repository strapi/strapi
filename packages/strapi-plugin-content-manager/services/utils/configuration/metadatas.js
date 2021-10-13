'use strict';

const _ = require('lodash');
const { getService } = require('../../../utils');
const {
  isSortable,
  isSearchable,
  isVisible,
  isRelation,
  getDefaultMainField,
} = require('./attributes');

function createDefaultMetadatas(schema) {
  return {
    ...Object.keys(schema.attributes).reduce((acc, name) => {
      acc[name] = createDefaultMetadata(schema, name);
      return acc;
    }, {}),
    id: {
      edit: {},
      list: {
        label: 'Id',
        searchable: true,
        sortable: true,
      },
    },
  };
}

function createDefaultMetadata(schema, name) {
  const edit = {
    label: _.upperFirst(name),
    description: '',
    placeholder: '',
    visible: isVisible(schema, name),
    editable: true,
  };

  if (isRelation(schema.attributes[name])) {
    const { targetModel } = schema.attributes[name];

    const targetSchema = getTargetSchema(targetModel);

    if (targetSchema) {
      edit.mainField = getDefaultMainField(targetSchema);
    }
  }

  _.assign(
    edit,
    _.pick(_.get(schema, ['config', 'metadatas', name, 'edit'], {}), [
      'label',
      'description',
      'placeholder',
      'visible',
      'editable',
      'mainField',
    ])
  );

  const list = {
    label: _.upperFirst(name),
    searchable: isSearchable(schema, name),
    sortable: isSortable(schema, name),
    ..._.pick(_.get(schema, ['config', 'metadatas', name, 'list'], {}), [
      'label',
      'searchable',
      'sortable',
    ]),
  };

  return { edit, list };
}

/** Synchronisation functions */

async function syncMetadatas(configuration, schema) {
  // clear all keys that do not exist anymore
  if (_.isEmpty(configuration.metadatas)) {
    return createDefaultMetadatas(schema);
  }

  // remove old keys
  const metasWithValidKeys = _.pick(configuration.metadatas, Object.keys(schema.attributes));

  // add new keys and missing fields
  const metasWithDefaults = _.merge({}, createDefaultMetadatas(schema), metasWithValidKeys);

  // clear the invalid mainFields
  const updatedMetas = Object.keys(metasWithDefaults).reduce((acc, key) => {
    const { edit, list } = metasWithDefaults[key];
    const attr = schema.attributes[key];

    let updatedMeta = { edit, list };
    // update sortable attr
    if (list.sortable && !isSortable(schema, key)) {
      _.set(updatedMeta, ['list', 'sortable'], false);
      _.set(acc, [key], updatedMeta);
    }

    if (list.searchable && !isSearchable(schema, key)) {
      _.set(updatedMeta, ['list', 'searchable'], false);
      _.set(acc, [key], updatedMeta);
    }

    if (!_.has(edit, 'mainField')) return acc;

    // remove mainField if the attribute is not a relation anymore
    if (!isRelation(attr)) {
      _.set(updatedMeta, 'edit', _.omit(edit, ['mainField']));
      _.set(acc, [key], updatedMeta);
      return acc;
    }

    // if the mainField is id you can keep it
    if (edit.mainField === 'id') return acc;

    // check the mainField in the targetModel
    const targetSchema = getTargetSchema(attr.targetModel);

    if (!targetSchema) return acc;

    if (!isSortable(targetSchema, edit.mainField)) {
      _.set(updatedMeta, ['edit', 'mainField'], getDefaultMainField(targetSchema));
      _.set(acc, [key], updatedMeta);
      return acc;
    }

    return acc;
  }, {});

  return _.assign(metasWithDefaults, updatedMetas);
}

const getTargetSchema = targetModel => {
  return getService('content-types').findContentType(targetModel);
};

module.exports = {
  createDefaultMetadatas,
  syncMetadatas,
};
