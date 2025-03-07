import pluralize from 'pluralize';

import { Schema } from '../../types/schema';

import type { ContentType, Component, AnyAttribute } from '../../../../../types';

const ACTION_TO_STATUS: Record<Schema['action'], ContentType['status']> = {
  create: 'NEW',
  remove: 'REMOVED',
  update: 'CHANGED',
};

const transformAttributesFromChatToCTB = (attributes: Schema['attributes']): AnyAttribute[] => {
  return Object.entries(attributes).map(([name, attribute]) => ({
    name,
    ...attribute,
  })) as any;
};

/**
 * Transform schema format
 *  AI chat -> CTB
 *
 * The AI chat returns a simplified format, and this layer transforms it to be compatible with the CTB reducer.
 *
 * We need to keep track of which changes have been made
 */
export const transformChatToCTB = (schema: Schema): ContentType | Component => {
  const singularName = pluralize.singular(schema.name).toLowerCase();
  const pluralName = pluralize.plural(schema.name).toLowerCase();

  if (schema.modelType === 'component') {
    return {
      category: schema.category || 'default',
      modelName: singularName,
      attributes: transformAttributesFromChatToCTB(schema.attributes),
      info: {
        displayName: schema.name,
        description: schema.description,
        // TODO
        // icon: schema.icon,
      },
      modelType: schema.modelType,
      uid: `${schema.category}.${singularName}`,
      collectionName: pluralName,
      isTemporary: true,
      status: schema.action ? ACTION_TO_STATUS[schema.action] : 'NEW',
      globalId: singularName,
    } satisfies Component;
  }

  return {
    uid: `api::${singularName}.${singularName}`,
    modelType: schema.modelType,
    modelName: singularName,
    kind: schema.kind!,
    info: {
      displayName: schema.name,
      singularName,
      pluralName,
    },
    collectionName: pluralName,
    attributes: transformAttributesFromChatToCTB(schema.attributes),
    options: {
      draftAndPublish: schema.options?.draftAndPublish,
    },
    pluginOptions: {
      i18n: {
        localized: schema.options?.localized,
      },
    },
    visible: true,
    isTemporary: true,
    status: schema.action ? ACTION_TO_STATUS[schema.action] : 'NEW',
    globalId: singularName,
  } satisfies ContentType;
};
