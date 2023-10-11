import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

import type { AttributeType } from '../../../types';
import type { UID } from '@strapi/types';

const retrieveComponentsFromSchema = (
  attributes: AttributeType<string>[],
  allComponentsData: any
): UID.Component[] => {
  const allComponents = attributes.reduce((acc: UID.Component[], current) => {
    const type = current.type;
    if (type === 'component') {
      const currentComponentName = current.component;
      // Push the existing compo
      acc.push(currentComponentName);

      const currentComponentAttributes = get(
        allComponentsData,
        [currentComponentName, 'schema', 'attributes'],
        []
      );

      // Retrieve the nested ones
      acc.push(...retrieveComponentsFromSchema(currentComponentAttributes, allComponentsData));
    }

    if (type === 'dynamiczone') {
      const dynamicZoneComponents = current.components;
      const componentsFromDZComponents = dynamicZoneComponents.reduce((acc2, currentUid) => {
        const compoAttrs = get(allComponentsData, [currentUid, 'schema', 'attributes'], []);

        return [...acc2, ...retrieveComponentsFromSchema(compoAttrs, allComponentsData)];
      }, []);

      return [...acc, ...dynamicZoneComponents, ...componentsFromDZComponents];
    }

    return acc;
  }, []);

  return makeUnique<UID.Component>(allComponents);
};

export { retrieveComponentsFromSchema };
