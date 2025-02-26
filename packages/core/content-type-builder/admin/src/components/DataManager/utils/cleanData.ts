import camelCase from 'lodash/camelCase';
import get from 'lodash/get';
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
import type { Internal } from '@strapi/types';

// TODO: reuse it to make sure relations WORK

// /**
//  *
//  * @param {Object} attributes
//  * @param {String} mainDataUID uid of the main data type
//  */
// const formatAttributes = (attributes: AnyAttribute[], mainDataUID: Internal.UID.Schema) => {
//   return attributes.reduce((acc: Record<string, AnyAttribute>, { name, ...rest }) => {
//     const currentAttribute = rest;
//     const hasARelationWithMainDataUID = currentAttribute.target === mainDataUID;
//     const isRelationType = currentAttribute.type === 'relation';
//     const currentTargetAttribute = get(currentAttribute, 'targetAttribute', null);

//     if (!hasARelationWithMainDataUID) {
//       if (isRelationType) {
//         const relationAttr = Object.assign({}, currentAttribute, {
//           targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
//         });

//         acc[name as string] = removeNullKeys(relationAttr) as AnyAttribute;
//       } else {
//         acc[name as string] = removeNullKeys(currentAttribute) as AnyAttribute;
//       }
//     }

//     if (hasARelationWithMainDataUID) {
//       const target = currentAttribute.target;

//       const formattedRelationAttribute = Object.assign({}, currentAttribute, {
//         target,
//         targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
//       });

//       acc[name as string] = removeNullKeys(formattedRelationAttribute) as AnyAttribute;
//     }

//     if (currentAttribute.customField) {
//       const customFieldAttribute = { ...currentAttribute, type: 'customField' };
//       acc[name as string] = removeNullKeys(customFieldAttribute) as AnyAttribute;
//     }

//     return acc;
//   }, {});
// };

// const formatRelationTargetAttribute = (targetAttribute: string | null) =>
//   targetAttribute === '-' ? null : targetAttribute;

// const removeNullKeys = (obj: Record<string, any>) =>
//   Object.keys(obj).reduce((acc: Record<string, any>, current) => {
//     if (obj[current] !== null && current !== 'plugin') {
//       acc[current] = obj[current];
//     }

//     return acc;
//   }, {});

const sortContentType = (types: ContentTypes) => {
  return sortBy(
    Object.keys(types)
      .map((uid) => ({
        visible: types[uid].visible,
        name: uid,
        title: types[uid].info.displayName,
        plugin: types[uid].plugin || null,
        uid,
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
        return compo.status !== 'UNCHANGED';
      })
      .map(formatTypeForRequest),
    contentTypes: Object.values(contentTypes)
      .filter((ct) => {
        return ct.status !== 'UNCHANGED';
      })
      .map(formatTypeForRequest),
  };
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
    ...omit(type, ['visible', 'uid', 'restrictRelationsTo', 'isTemporary']),
    ...type.options,
    ...type.info,
    attributes: type.attributes.map((attr) => {
      let action;
      // should we do a diff with the initial data instead of trusting the state status ??
      switch (attr.status) {
        case 'UNCHANGED':
          action = 'modify';
        case 'NEW':
          action = 'add';
          break;
        case 'CHANGED':
          action = 'modify';
          break;
        case 'REMOVED':
          return { action: 'delete', name: attr.name };
      }

      return {
        action,
        name: attr.name,
        properties: omit(attr, ['status', 'name']),
      };
    }),
  };
};

export { stateToRequestData, sortContentType };
