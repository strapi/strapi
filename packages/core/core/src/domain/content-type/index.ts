import { cloneDeep } from 'lodash/fp';
import _ from 'lodash';
import { yup, contentTypes as contentTypesUtils } from '@strapi/utils';
import type { Schema } from '@strapi/types';
import { validateContentTypeDefinition } from './validator';

export type ContentTypeDefinition = {
  schema: Schema.ContentType;
  actions: Record<string, unknown>;
  lifecycles: Record<string, unknown>;
};

const {
  CREATED_AT_ATTRIBUTE,
  UPDATED_AT_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  FIRST_PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = contentTypesUtils.constants;

const createContentType = (uid: string, definition: ContentTypeDefinition) => {
  try {
    validateContentTypeDefinition(definition);
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      throw new Error(`Content Type Definition is invalid for ${uid}'.\n${e.errors}`);
    }

    throw e;
  }

  const { schema, actions, lifecycles } = cloneDeep(definition);

  // general info
  Object.assign(schema, {
    uid,
    modelType: 'contentType',
    kind: schema.kind || 'collectionType',
    __schema__: pickSchema(definition.schema),
    modelName: definition.schema.info.singularName,
    actions,
    lifecycles,
  });

  addTimestamps(schema);

  // Published at is added regardless of draft and publish being enabled
  // In case it is not enabled, value will be always published, and it will not contain a draft
  addDraftAndPublish(schema);

  addCreatorFields(schema);

  addFirstPublishedAt(schema);

  return schema;
};

const addTimestamps = (schema: Schema.ContentType) => {
  // attributes
  Object.assign(schema.attributes, {
    [CREATED_AT_ATTRIBUTE]: {
      type: 'datetime',
    },
    // TODO: handle on edit set to new date
    [UPDATED_AT_ATTRIBUTE]: {
      type: 'datetime',
    },
  });
};

const addDraftAndPublish = (schema: Schema.ContentType) => {
  if (!_.has(schema, 'options.draftAndPublish')) {
    _.set(schema, 'options.draftAndPublish', false); // Disabled by default
  }

  schema.attributes[PUBLISHED_AT_ATTRIBUTE] = {
    type: 'datetime',
    configurable: false,
    writable: true,
    visible: true,
    default() {
      return new Date();
    },
  };
};

const addFirstPublishedAt = (schema: Schema.ContentType) => {
  const isEnabled = contentTypesUtils.hasFirstPublishedAtField(schema);

  // Note: As an expertimental feature, we are okay if this data is deleted if this feature is
  // switched off. Once "preserve_attributes" come into play, this will be updated.
  if (isEnabled) {
    strapi.log.warn(`Experimental feature enabled: firstPublishedAt on ${schema.collectionName}`);
    schema.attributes[FIRST_PUBLISHED_AT_ATTRIBUTE] = {
      type: 'datetime',
      configurable: false,
      writable: true,
      visible: false,
      private: !isEnabled,
    };
  }
};

const addCreatorFields = (schema: Schema.ContentType) => {
  const isPrivate = !_.get(schema, 'options.populateCreatorFields', false);

  schema.attributes[CREATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'admin::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };

  schema.attributes[UPDATED_BY_ATTRIBUTE] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'admin::user',
    configurable: false,
    writable: false,
    visible: false,
    useJoinTable: false,
    private: isPrivate,
  };
};

const getGlobalId = (schema: Schema.ContentType, prefix?: string) => {
  const modelName = schema.info.singularName;
  const globalId = prefix ? `${prefix}-${modelName}` : modelName;

  return schema.globalId || _.upperFirst(_.camelCase(globalId));
};

const pickSchema = (model: Schema.ContentType) => {
  const schema = _.cloneDeep(
    _.pick(model, [
      'connection',
      'collectionName',
      'info',
      'options',
      'pluginOptions',
      'attributes',
      'kind',
    ])
  );

  schema.kind = model.kind || 'collectionType';
  return schema;
};

export { createContentType, getGlobalId };
