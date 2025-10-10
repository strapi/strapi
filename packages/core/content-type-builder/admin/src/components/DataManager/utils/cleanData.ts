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

type TrackingEventProperties = {
  newContentTypes: number;
  editedContentTypes: number;
  deletedContentTypes: number;
  newComponents: number;
  editedComponents: number;
  deletedComponents: number;
  newFields: number;
  editedFields: number;
  deletedFields: number;
};

const stateToRequestData = ({
  components,
  contentTypes,
}: {
  components: Components;
  contentTypes: ContentTypes;
}) => {
  const trackingEventProperties: TrackingEventProperties = {
    newContentTypes: 0,
    editedContentTypes: 0,
    deletedContentTypes: 0,
    newComponents: 0,
    editedComponents: 0,
    deletedComponents: 0,
    newFields: 0,
    editedFields: 0,
    deletedFields: 0,
  };

  const formattedComponents = Object.values(components)
    .filter((compo) => {
      return ['NEW', 'CHANGED', 'REMOVED'].includes(compo.status);
    })
    .map((component) => {
      const requestFormattedComponent = formatTypeForRequest(component);

      const eventAction = requestFormattedComponent.action as 'create' | 'update' | 'delete';
      updateEventCounts(
        { ...component, action: eventAction },
        trackingEventProperties,
        'component'
      );

      return requestFormattedComponent;
    });

  const formattedContentTypes = Object.values(contentTypes)
    .filter((contentType) => {
      return ['NEW', 'CHANGED', 'REMOVED'].includes(contentType.status);
    })
    .map((contentType) => {
      const requestFormattedContentType = formatTypeForRequest(contentType);

      const eventAction = requestFormattedContentType.action as 'create' | 'update' | 'delete';
      updateEventCounts(
        { ...contentType, action: eventAction },
        trackingEventProperties,
        'contentType'
      );

      return requestFormattedContentType;
    });

  return {
    requestData: {
      components: formattedComponents,
      contentTypes: formattedContentTypes,
    },
    trackingEventProperties,
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
    return {
      ...attr,
      targetAttribute: attr.targetAttribute === '-' ? null : attr.targetAttribute,
      // Explicitly preserve conditions for relations
      ...(attr.conditions && { conditions: attr.conditions }),
    };
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

const updateEventCounts = (
  type: (ContentType | Component) & { action?: 'create' | 'update' | 'delete' },
  counts: TrackingEventProperties,
  entityType: 'component' | 'contentType'
) => {
  if (!type || typeof type.action !== 'string') {
    return;
  }

  const isContentType = entityType === 'contentType';

  switch (type.action) {
    case 'create':
      if (isContentType) {
        counts.newContentTypes++;
      } else {
        counts.newComponents++;
      }
      break;
    case 'update':
      if (isContentType) {
        counts.editedContentTypes++;
      } else {
        counts.editedComponents++;
      }
      break;
    case 'delete':
      if (isContentType) {
        counts.deletedContentTypes++;
      } else {
        counts.deletedComponents++;
      }
      break;
    default:
      break;
  }

  if (Array.isArray(type.attributes)) {
    if (type.action === 'delete') {
      counts.deletedFields += type.attributes.length;
    } else {
      type.attributes.forEach((attribute) => {
        if (!attribute || typeof attribute.status !== 'string') {
          return;
        }

        switch (attribute.status) {
          case 'NEW':
            counts.newFields++;
            break;
          case 'CHANGED':
            counts.editedFields++;
            break;
          case 'REMOVED':
            counts.deletedFields++;
            break;
          case 'UNCHANGED':
          default:
            break;
        }
      });
    }
  }
};

export { stateToRequestData, sortContentType };
