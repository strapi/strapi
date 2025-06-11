import type { Components, Component } from '../../../types';
import type { UID } from '@strapi/types';

export type NestedComponent = {
  component: UID.Component;
  uidsOfAllParents?: UID.Component[];
  parentCompoUid?: UID.Component;
};

export const retrieveNestedComponents = (appComponents: Components): NestedComponent[] => {
  const nestedComponents = Object.keys(appComponents).reduce((acc: NestedComponent[], current) => {
    const componentAttributes = appComponents?.[current]?.attributes ?? [];
    const currentComponentNestedCompos = getComponentsNestedWithinComponent(
      componentAttributes,
      current as UID.Component
    );
    return [...acc, ...currentComponentNestedCompos];
  }, []);

  return mergeComponents(nestedComponents);
};

const getComponentsNestedWithinComponent = (
  componentAttributes: Component['attributes'],
  parentCompoUid: UID.Component
) => {
  return componentAttributes.reduce((acc: NestedComponent[], current) => {
    const { type } = current;

    if (type === 'component') {
      acc.push({
        component: current.component,
        parentCompoUid,
      });
    }

    return acc;
  }, []);
};

// Merge duplicate components
const mergeComponents = (originalComponents: NestedComponent[]): NestedComponent[] => {
  const componentMap = new Map();
  // Populate the map with component and its parents
  originalComponents.forEach(({ component, parentCompoUid }) => {
    if (!componentMap.has(component)) {
      componentMap.set(component, new Set());
    }
    componentMap.get(component).add(parentCompoUid);
  });

  // Convert the map to the desired array format
  const transformedComponents: NestedComponent[] = Array.from(componentMap.entries()).map(
    ([component, parentCompoUidSet]) => ({
      component,
      uidsOfAllParents: Array.from(parentCompoUidSet),
    })
  );

  return transformedComponents;
};
