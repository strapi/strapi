import _ from 'lodash';
import { getService } from '../../../utils';
import {
  isSortable,
  isSearchable,
  isVisible,
  isListable,
  isRelation,
  getDefaultMainField,
} from './attributes';

function createDefaultMetadatas(schema: any) {
  return {
    ...Object.keys(schema.attributes).reduce((acc: any, name) => {
      acc[name] = createDefaultMetadata(schema, name);
      return acc;
    }, {}),
    id: {
      edit: {},
      list: {
        label: 'id',
        searchable: true,
        sortable: true,
      },
    },
  };
}

function createDefaultMetadata(schema: any, name: any) {
  const edit = {
    label: name,
    description: '',
    placeholder: '',
    visible: isVisible(schema, name),
    editable: true,
  } as any;

  const fieldAttributes = schema.attributes[name];
  if (isRelation(fieldAttributes)) {
    const { targetModel } = fieldAttributes;

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
    // @ts-expect-error we need to specify these properties
    label: name,
    // @ts-expect-error we need to specify these properties
    searchable: isSearchable(schema, name),
    // @ts-expect-error we need to specify these properties
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

async function syncMetadatas(configuration: any, schema: any) {
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

    const updatedMeta = { edit, list };
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

    if (!isSortable(targetSchema, edit.mainField) && !isListable(targetSchema, edit.mainField)) {
      _.set(updatedMeta, ['edit', 'mainField'], getDefaultMainField(targetSchema));
      _.set(acc, [key], updatedMeta);
      return acc;
    }

    return acc;
  }, {});

  return _.assign(metasWithDefaults, updatedMetas);
}

const getTargetSchema = (targetModel: any) => {
  return getService('content-types').findContentType(targetModel);
};

export { createDefaultMetadatas, syncMetadatas };
