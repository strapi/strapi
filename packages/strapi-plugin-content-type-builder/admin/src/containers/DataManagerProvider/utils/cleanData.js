import { get, isEqual, omit } from 'lodash';
import makeUnique from '../../../utils/makeUnique';

const getCreatedAndModifiedComponents = (allComponents, initialComponents) => {
  const componentUIDsToReturn = Object.keys(allComponents).filter(compoUid => {
    const currentCompo = get(allComponents, compoUid, {});
    const initialCompo = get(initialComponents, compoUid, {});
    const hasComponentBeenCreated = get(currentCompo, ['isTemporary'], false);
    const hasComponentBeenModified = !isEqual(currentCompo, initialCompo);

    return hasComponentBeenCreated || hasComponentBeenModified;
  });

  return makeUnique(componentUIDsToReturn);
};

const formatComponent = (component, mainDataUID, isCreatingData = false) => {
  const formattedAttributes = formatAttributes(
    get(component, 'schema.attributes', {}),
    mainDataUID,
    isCreatingData,
    true
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

/**
 *
 * @param {Object} attributes
 * @param {String} mainDataUID uid of the main data type
 * @param {Boolean} isCreatingMainData
 * @param {Boolean} isComponent
 */
const formatAttributes = (
  attributes,
  mainDataUID,
  isCreatingMainData,
  isComponent
) => {
  return Object.keys(attributes).reduce((acc, current) => {
    const currentAttribute = get(attributes, current, {});
    const hasARelationWithMainDataUID = currentAttribute.target === mainDataUID;

    if (!hasARelationWithMainDataUID) {
      acc[current] = currentAttribute;
    }

    if (hasARelationWithMainDataUID) {
      const currentTargetAttribute = get(
        currentAttribute,
        'targetAttribute',
        null
      );

      let target = currentTargetAttribute.target;

      if (isCreatingMainData) {
        target = isComponent ? '__contentType__' : '__self__';
      }

      const formattedRelationAttribute = Object.assign({}, currentAttribute, {
        target,
        targetAttribute:
          currentTargetAttribute === '-' ? null : currentTargetAttribute,
      });

      acc[current] = formattedRelationAttribute;
    }

    return acc;
  }, {});
};

export { formatComponent, getCreatedAndModifiedComponents };
