import camelCase from 'lodash/camelCase';
import omit from 'lodash/omit';
import sortBy from 'lodash/sortBy';

import { pluginId } from '../../../pluginId';

import type {
  Component,
  Components,
  ContentTypes,
  ContentType,
  AnyAttribute,
} from '../../../types';
import type { UID } from '@strapi/types';

const sortContentType = (types: ContentTypes) => {
  return sortBy(
    Object.keys(types)
      .map((uid) => ({
        visible: types[uid].visible,
        name: uid as UID.ContentType,
        title: types[uid].info.displayName,
        plugin: types[uid].plugin,
        uid: uid as UID.ContentType,
        to: `/plugins/${pluginId}/content-types/${uid}`,
        kind: types[uid].kind,
        restrictRelationsTo: types[uid].restrictRelationsTo,
        status: types[uid].status,
      }))
      .filter((obj) => obj !== null),
    (obj) => camelCase(obj.title)
  );
};

const stateToRequestData = (state: { components: Components; contentTypes: ContentTypes }) => {
  const { components, contentTypes } = state;

  return {
    components: Object.values(components)
      .filter((compo) => {
        return ['NEW', 'CHANGED', 'REMOVED'].includes(compo.status);
      })
      .map(formatTypeForRequest),
    contentTypes: Object.values(contentTypes)
      .filter((ct) => {
        return ['NEW', 'CHANGED', 'REMOVED'].includes(ct.status);
      })
      .map(formatTypeForRequest),
  };
};

const removeNullKeys = (obj: Record<string, unknown>) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0;
      }
      if (typeof value === 'object' && value !== null) {
        return Object.keys(value).length > 0;
      }
      return value !== null && value !== undefined;
    })
  );
};

const formatAttribute = (attr: AnyAttribute) => {
  if ('customField' in attr) {
    return { ...attr, type: 'customField' };
  }

  if ('targetAttribute' in attr) {
    return { ...attr, targetAttribute: attr.targetAttribute === '-' ? null : attr.targetAttribute };
  }

  return attr;
};

const formatTypeForRequest = (type: ContentType | Component) => {
  let action;
  // should we do a diff with the initial data instead of trusting the state status ??
  switch (type.status) {
    case 'NEW':
      action = 'create';
      break;
    case 'CHANGED':
      action = 'update';
      break;
    case 'REMOVED':
      return { action: 'delete', uid: type.uid };
    default:
      throw new Error('Invalid status');
  }

  return {
    action,
    uid: type.uid,
    category: 'category' in type ? type.category : undefined,
    ...omit(type, ['info', 'options', 'visible', 'uid', 'restrictRelationsTo']),
    ...type.options,
    ...type.info,
    attributes: type.attributes.map((attr) => {
      let action;

      switch (attr.status) {
        // NOTE: we want to always send the full data to preserve the order

        case 'NEW':
          action = 'create';
          break;
        case 'REMOVED':
          return { action: 'delete', name: attr.name };
        case 'UNCHANGED':
        case 'CHANGED':
        default:
          action = 'update';
      }

      return {
        action,
        name: attr.name,
        properties: removeNullKeys(omit(formatAttribute(attr), ['status', 'name'])),
      };
    }),
  };
};

export { stateToRequestData, sortContentType };
