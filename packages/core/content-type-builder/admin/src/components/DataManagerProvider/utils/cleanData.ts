import camelCase from 'lodash/camelCase';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import omit from 'lodash/omit';
import sortBy from 'lodash/sortBy';

import { pluginId } from '../../../pluginId';
import { makeUnique } from '../../../utils/makeUnique';

import type { Components, Component, AttributeType, ContentTypes } from '../../../types';
import type { Internal } from '@strapi/types';

const getCreatedAndModifiedComponents = (
  allComponents: Components,
  initialComponents: Components
) => {
  const componentUIDsToReturn = Object.keys(allComponents).filter((compoUid) => {
    const currentCompo = get(allComponents, compoUid, {});
    const initialCompo = get(initialComponents, compoUid, {});
    const hasComponentBeenCreated = get(currentCompo, ['isTemporary'], false);
    const hasComponentBeenModified = !isEqual(currentCompo, initialCompo);

    return hasComponentBeenCreated || hasComponentBeenModified;
  });

  return makeUnique(componentUIDsToReturn);
};

const formatComponent = (
  component: Component | Record<string, any>,
  mainDataUID: Internal.UID.Schema
) => {
  const formattedAttributes = formatAttributes(
    get(component, 'schema.attributes', []),
    mainDataUID
  );

  // Set tmpUID if the component has just been created
  // Keep the uid if the component already exists
  const compoUID = get(component, 'isTemporary', false)
    ? { tmpUID: component.uid }
    : { uid: component.uid };

  const formattedComponent = Object.assign(
    {},
    compoUID,
    { category: component.category },
    // Omit the attributes since we want to format them
    omit(component.schema, 'attributes'),
    // Add the formatted attributes
    { attributes: formattedAttributes }
  );

  return formattedComponent;
};

const formatMainDataType = (data: any, isComponent = false) => {
  const mainDataUID = get(data, 'uid', null);

  const formattedAttributes = formatAttributes(get(data, 'schema.attributes', []), mainDataUID);
  const initObj = isComponent ? { category: get(data, 'category', '') } : {};

  const formattedContentType = Object.assign(initObj, omit(data.schema, 'attributes'), {
    attributes: formattedAttributes,
  });

  delete formattedContentType.uid;
  delete formattedContentType.isTemporary;
  delete formattedContentType.visible;
  delete formattedContentType.restrictRelationsTo;

  return formattedContentType;
};

/**
 *
 * @param {Object} attributes
 * @param {String} mainDataUID uid of the main data type
 */
const formatAttributes = (attributes: AttributeType[], mainDataUID: Internal.UID.Schema) => {
  return attributes.reduce((acc: Record<string, AttributeType>, { name, ...rest }) => {
    const currentAttribute = rest;
    const hasARelationWithMainDataUID = currentAttribute.target === mainDataUID;
    const isRelationType = currentAttribute.type === 'relation';
    const currentTargetAttribute = get(currentAttribute, 'targetAttribute', null);

    if (!hasARelationWithMainDataUID) {
      if (isRelationType) {
        const relationAttr = Object.assign({}, currentAttribute, {
          targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
        });

        acc[name as string] = removeNullKeys(relationAttr) as AttributeType;
      } else {
        acc[name as string] = removeNullKeys(currentAttribute) as AttributeType;
      }
    }

    if (hasARelationWithMainDataUID) {
      const target = currentAttribute.target;

      const formattedRelationAttribute = Object.assign({}, currentAttribute, {
        target,
        targetAttribute: formatRelationTargetAttribute(currentTargetAttribute),
      });

      acc[name as string] = removeNullKeys(formattedRelationAttribute) as AttributeType;
    }

    if (currentAttribute.customField) {
      const customFieldAttribute = { ...currentAttribute, type: 'customField' };
      acc[name as string] = removeNullKeys(customFieldAttribute) as AttributeType;
    }

    return acc;
  }, {});
};

const formatRelationTargetAttribute = (targetAttribute: string | null) =>
  targetAttribute === '-' ? null : targetAttribute;

const removeNullKeys = (obj: Record<string, any>) =>
  Object.keys(obj).reduce((acc: Record<string, any>, current) => {
    if (obj[current] !== null && current !== 'plugin') {
      acc[current] = obj[current];
    }

    return acc;
  }, {});

const getComponentsToPost = (
  allComponents: Components,
  initialComponents: Components,
  mainDataUID: Internal.UID.Schema
) => {
  const componentsToFormat = getCreatedAndModifiedComponents(allComponents, initialComponents);
  const formattedComponents = componentsToFormat.map((compoUID) => {
    const currentCompo = get(allComponents, compoUID, {});
    const formattedComponent = formatComponent(currentCompo, mainDataUID);

    return formattedComponent;
  });

  return formattedComponents;
};

const sortContentType = (types: ContentTypes) =>
  sortBy(
    Object.keys(types)
      .map((uid) => ({
        visible: types[uid].schema.visible,
        name: uid,
        title: types[uid].schema.displayName,
        plugin: types[uid].plugin || null,
        uid,
        to: `/plugins/${pluginId}/content-types/${uid}`,
        kind: types[uid].schema.kind,
        restrictRelationsTo: types[uid].schema.restrictRelationsTo,
      }))
      .filter((obj) => obj !== null),
    (obj) => camelCase(obj.title)
  );

export {
  formatComponent,
  formatMainDataType,
  getComponentsToPost,
  getCreatedAndModifiedComponents,
  sortContentType,
};
