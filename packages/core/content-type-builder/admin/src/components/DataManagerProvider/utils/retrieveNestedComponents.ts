import type { Internal } from '@strapi/types';

export type NestedComponent = {
  component: Internal.UID.Component;
  parentCompoUid?: Internal.UID.Component[];
};

export const retrieveNestedComponents = (appComponents: any): NestedComponent[] => {
  const nestedComponents = Object.keys(appComponents).reduce((acc: any, current: any) => {
    const componentAttributes = appComponents?.[current]?.schema?.attributes ?? [];
    const currentComponentNestedCompos = getComponentsFromComponent(componentAttributes, current);
    return [...acc, ...currentComponentNestedCompos];
  }, []);

  return mergeComponents(nestedComponents);
};

const getComponentsFromComponent = (
  componentAttributes: any,
  parentCompoUid: Internal.UID.Component
) => {
  return componentAttributes.reduce((acc: any, current: any) => {
    const { type, component } = current;
    if (type === 'component') {
      acc.push({
        component,
        parentCompoUid,
      });
    }

    return acc;
  }, []);
};

// merge components different parents if they exist
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
      parentCompoUid: Array.from(parentCompoUidSet),
    })
  );

  return transformedComponents;
};
