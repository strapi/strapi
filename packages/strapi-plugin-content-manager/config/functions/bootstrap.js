'use strict';

const _ = require('lodash');

function getContentManagerKeys({ model }, key) {
  if (model.orm === 'mongoose') {
    return model
      .find({
        $regex: `${key}.*`,
      })
      .then(results => results.map(({ value }) => JSON.parse(value)));
  }

  return model
    .query(qb => {
      qb.where('key', 'like', `${key}%`);
    })
    .fetchAll()
    .then(config => config && config.toJSON())
    .then(results => results.map(({ value }) => JSON.parse(value)));
}

async function updateGroups() {
  const service = strapi.plugins['content-manager'].services.groups;

  const configurations = await strapi
    .query('core_store')
    .custom(getContentManagerKeys)(
    'plugin_content_manager_configuration_groups'
  );

  const realUIDs = Object.keys(strapi.groups);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const groupsToUpdate = _.intersection(realUIDs, DBUIDs);
  const groupsToAdd = _.difference(realUIDs, DBUIDs);
  const groupsToDelete = _.difference(DBUIDs, realUIDs);

  await Promise.all(
    groupsToDelete.map(uid => service.deleteConfiguration(uid))
  );

  const generateNewConfiguration = async uid => {
    return service.setConfiguration(
      uid,
      await buildDefaultConfiguration(strapi.groups[uid])
    );
  };

  await Promise.all(groupsToAdd.map(uid => generateNewConfiguration(uid)));

  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);
    const model = strapi.groups[uid];
    return service.setConfiguration(uid, {
      settings: await updateSettings(conf, model),
      layouts: await updateLayouts(conf, model),
      metadatas: await updateMetadatas(conf, model),
    });
  };

  await Promise.all(groupsToUpdate.map(uid => updateConfiguration(uid)));
}

async function buildDefaultSettings() {
  const generalSettings = await strapi.plugins[
    'content-manager'
  ].services.generalsettings.getGeneralSettings();

  return {
    ...generalSettings,
    mainField: 'id',
    defaultSortBy: 'id',
    defaultSortOrder: 'ASC',
  };
}

const NON_SORTABLES = ['group', 'json', 'array'];
const isSortable = attribute => {
  if (!_.has(attribute, 'type')) {
    return false;
  }

  if (NON_SORTABLES.includes(attribute.type)) {
    return false;
  }

  return true;
};

// check it is in the attributes not in allAttributes
const isEditable = (model, name) => _.has(model.attributes, name);

function buildDefaultMetadata(model, name) {
  const attr = model.allAttributes[name];
  const edit = {
    label: name,
    description: '',
    placeholder: '',
    visible: true, // TODO: depends on the type ?
    editable: isEditable(attr),
  };

  if (_.has(attr, 'model') || _.has(attr, 'collection')) {
    edit.mainField = 'id';
  }

  const list = {
    label: name,
    searchable: true,
    sortable: isSortable(attr),
  };

  return { edit, list };
}

async function buildDefaultMetadatas(model) {
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
      acc[name] = buildDefaultMetadata(model, name);
      return acc;
    }, {}),
  };
}

function buildDefaultListLayout(model) {
  return ['id']
    .concat(Object.keys(model.allAttributes))
    .filter(name => hasListableAttribute(model, name))
    .slice(0, DEFAULT_LIST_LENGTH);
}

function buildDefaultEditRelationsLayout(model) {
  return Object.keys(model.allAttributes).filter(name =>
    hasRelationAttribute(model, name)
  );
}

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
const rowSize = els => els.reduce((sum, el) => sum + el.size, 0);
function buildDefaultEditLayout(model) {
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

async function buildDefaultLayouts(model) {
  return {
    list: buildDefaultListLayout(model),
    editRelations: buildDefaultEditRelationsLayout(model),
    edit: buildDefaultEditLayout(model),
  };
}

async function buildDefaultConfiguration(model) {
  return {
    settings: await buildDefaultSettings(),
    metadatas: await buildDefaultMetadatas(model),
    layouts: await buildDefaultLayouts(model),
  };
}

async function updateContentTypesScope(models, configurations, source) {
  const service = strapi.plugins['content-manager'].services.contenttypes;

  const realUIDs = Object.keys(models);
  const DBUIDs = configurations.map(({ uid }) => uid);
  const contentTypesToUpdate = _.intersection(realUIDs, DBUIDs);
  const contentTypesToAdd = _.difference(realUIDs, DBUIDs);
  const contentTypesToDelete = _.difference(DBUIDs, realUIDs);

  await Promise.all(
    contentTypesToDelete.map(uid =>
      service.deleteContentTypeConfiguration({ uid, source })
    )
  );

  const generateNewConfiguration = async uid => {
    return service.setContentTypeConfiguration(
      { uid, source },
      await buildDefaultConfiguration(models[uid])
    );
  };

  await Promise.all(
    contentTypesToAdd.map(uid => generateNewConfiguration(uid))
  );

  const updateConfiguration = async uid => {
    const conf = configurations.find(conf => conf.uid === uid);
    const model = models[uid];
    return service.setContentTypeConfiguration(
      { uid, source },
      {
        settings: await updateSettings(conf, model),
        layouts: await updateLayouts(conf, model),
        metadatas: await updateMetadatas(conf, model),
      }
    );
  };

  await Promise.all(contentTypesToUpdate.map(uid => updateConfiguration(uid)));
}

async function updateContentTypes() {
  const configurations = await strapi
    .query('core_store')
    .custom(getContentManagerKeys)(
    'plugin_content_manager_configuration_content_types'
  );

  await updateContentTypesScope(
    _.omit(strapi.models, ['core_store']),
    configurations.filter(({ source }) => !source)
  );
  await updateContentTypesScope(
    strapi.admin.models,
    configurations.filter(({ source }) => source === 'admin'),
    'admin'
  );

  await Promise.all(
    Object.keys(strapi.plugins).map(pluginKey => {
      const plugin = strapi.plugins[pluginKey];
      return updateContentTypesScope(
        plugin.models || {},
        configurations.filter(({ source }) => source === pluginKey),
        pluginKey
      );
    })
  );
}

async function updateMetadatas(configuration, model) {
  // clear all keys that do not exist anymore
  if (_.isEmpty(configuration.metadatas)) return buildDefaultMetadatas(model);

  // remove old keys
  const metasWithValidKeys = _.pick(
    configuration.metadatas,
    ['id'].concat(Object.keys(model.allAttributes))
  );

  // add new keys and missing fields
  const metasWithDefaults = _.merge(
    {},
    await buildDefaultMetadatas(model),
    metasWithValidKeys
  );

  // clear the invalid mainFields
  const updatedMetas = Object.keys(metasWithDefaults).reduce((acc, key) => {
    const meta = metasWithDefaults[key];
    const { edit } = meta;
    if (!_.has(edit, 'mainField')) return acc;

    // remove mainField if the attribute is not a relation anymore
    if (_.has(model.allAttributes[key], 'type')) {
      acc[key] = {
        ...meta,
        edit: _.omit(edit, ['mainField']),
      };
      return acc;
    }

    // if the mainField is id you can keep it
    if (edit.mainField === 'id') return acc;

    // check the mainField in the targetModel
    const attr = model.allAttributes[key];
    const target = strapi.getModel(attr.model || attr.collection, attr.plugin);

    if (!hasListableAttribute(target, meta.mainField)) {
      acc[key] = {
        ...meta,
        edit: {
          ...edit,
          mainField: 'id',
        },
      };
      return acc;
    }
    return acc;
  }, {});

  return _.assign(metasWithDefaults, updatedMetas);
}

async function updateSettings(configuration, model) {
  if (_.isEmpty(configuration.settings)) return buildDefaultSettings(model);

  const { mainField = 'id', defaultSortBy = 'id' } =
    configuration.settings || {};

  return {
    ...configuration.settings,
    mainField: hasListableAttribute(model, mainField) ? mainField : 'id',
    defaultSortBy: hasListableAttribute(model, defaultSortBy)
      ? defaultSortBy
      : 'id',
  };
}

const DEFAULT_LIST_LENGTH = 4;
function updateLayouts(configuration, model) {
  if (_.isEmpty(configuration.layouts)) return buildDefaultLayouts(model);

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
    list: cleanList.length > 0 ? cleanList : buildDefaultListLayout(model),
    editRelations:
      cleanEditRelations.length > 0
        ? cleanEditRelations
        : buildDefaultEditRelationsLayout(model),
    edit: cleanEdit.length > 0 ? cleanEdit : buildDefaultEditLayout(model),
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
  const newEditAttributes = newAttributes.filter(key =>
    hasEditableAttribute(model, key)
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

const hasRelationAttribute = (model, attr) => {
  return (
    _.has(model.allAttributes[attr], 'model') ||
    _.has(model.allAttributes[attr], 'collection')
  );
};

const hasEditableAttribute = (model, attr) => {
  if (!_.has(model.allAttributes, attr)) {
    return false;
  }

  if (!_.has(model.allAttributes[attr], 'type')) {
    return false;
  }

  return true;
};

const hasListableAttribute = (model, attr) => {
  if (attr === 'id') return true;

  if (!_.has(model.allAttributes, attr)) {
    return false;
  }

  if (!_.has(model.allAttributes[attr], 'type')) {
    return false;
  }

  if (NON_SORTABLES.includes(model.allAttributes[attr].type)) {
    return false;
  }

  return true;
};

async function bootstrap() {
  await updateGroups();
  await updateContentTypes();
}

module.exports = cb => {
  bootstrap().then(() => cb(), err => cb(err));
};
