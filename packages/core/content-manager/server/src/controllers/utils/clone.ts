import { set } from 'lodash/fp';
import strapiUtils from '@strapi/utils';
import { ProhibitedCloningField } from '../../../../shared/contracts/collection-types';

const { isVisibleAttribute } = strapiUtils.contentTypes;

/**
 * Use an array of strings to represent the path to a field, so we can show breadcrumbs in the admin
 * We can't use special characters as delimiters, because the path includes display names
 * for dynamic zone components, which can contain any character.
 */

function checkRelation(model: any, attributeName: any, path: string[]): ProhibitedCloningField[] {
  // we don't care about createdBy, updatedBy, localizations etc.
  if (!isVisibleAttribute(model, attributeName)) {
    // Return empty array and not null so we can always spread the result
    return [];
  }

  /**
   * Only one-to-many and one-to-one (when they're reversed, not one-way) are dangerous,
   * because the other relations don't "steal" the relation from the entry we're cloning
   */
  const { relation, inversedBy, mappedBy } = model.attributes[attributeName];

  if (
    ['oneToOne', 'oneToMany'].includes(relation) &&
    [mappedBy, inversedBy].some((key) => key != null)
  ) {
    return [[[...path, attributeName], 'relation']];
  }

  return [];
}

const getProhibitedCloningFields = (
  uid: any,
  pathPrefix: string[] = []
): ProhibitedCloningField[] => {
  const model = strapi.getModel(uid);

  const prohibitedFields = Object.keys(model.attributes).reduce<ProhibitedCloningField[]>(
    (acc, attributeName) => {
      const attribute: any = model.attributes[attributeName];
      const attributePath = [...pathPrefix, attributeName];

      switch (attribute.type) {
        case 'relation':
          return [...acc, ...checkRelation(model, attributeName, pathPrefix)];
        case 'component':
          return [...acc, ...getProhibitedCloningFields(attribute.component, attributePath)];
        case 'dynamiczone':
          return [
            ...acc,
            ...(attribute.components || []).flatMap((componentUID: any) =>
              getProhibitedCloningFields(componentUID, [
                ...attributePath,
                strapi.getModel(componentUID).info.displayName,
              ])
            ),
          ];
        case 'uid':
          return [...acc, [attributePath, 'unique']];
        default:
          if (attribute?.unique) {
            return [...acc, [attributePath, 'unique']];
          }
          return acc;
      }
    },
    []
  );

  return prohibitedFields;
};

/**
 * Iterates all attributes of the content type, and removes the ones that are not creatable.
 *   - If it's a relation, it sets the value to [] or null.
 *   - If it's a regular attribute, it sets the value to null.
 * When cloning, if you don't set a field it will be copied from the original entry. So we need to
 * remove the fields that the user can't create.
 */
const excludeNotCreatableFields =
  (uid: any, permissionChecker: any) =>
  (body: any, path = []): any => {
    const model = strapi.getModel(uid);
    const canCreate = (path: any) => permissionChecker.can.create(null, path);

    return Object.keys(model.attributes).reduce((body, attributeName) => {
      const attribute = model.attributes[attributeName];
      const attributePath = [...path, attributeName].join('.');

      // Ignore the attribute if it's not visible
      if (!isVisibleAttribute(model, attributeName)) {
        return body;
      }

      switch (attribute.type) {
        // Relation should be empty if the user can't create it
        case 'relation': {
          if (canCreate(attributePath)) return body;
          return set(attributePath, { set: [] }, body);
        }
        // Go deeper into the component
        case 'component': {
          return excludeNotCreatableFields(attribute.component, permissionChecker)(body, [
            ...path,
            attributeName,
          ] as any);
        }
        // Attribute should be null if the user can't create it
        default: {
          if (canCreate(attributePath)) return body;
          return set(attributePath, null, body);
        }
      }
    }, body);
  };

export { getProhibitedCloningFields, excludeNotCreatableFields };
