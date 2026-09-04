import type { Components, Component } from '../../../types';
import type { UID } from '@strapi/types';

export type NestedComponent = {
  component: UID.Component;
  uidsOfAllParents?: UID.Component[];
  parentCompoUid?: UID.Component;
  /** UIDs of parents that reference this component via a dynamiczone attribute */
  dzParentUids?: UID.Component[];
};

/** Pre-merge entry with edge-type metadata, consumed only by mergeComponents */
type RawNestedComponent = NestedComponent & { isDzEdge?: boolean };

export const retrieveNestedComponents = (appComponents: Components): NestedComponent[] => {
  const nestedComponents = Object.keys(appComponents).reduce(
    (acc: RawNestedComponent[], current) => {
      const componentAttributes = appComponents?.[current]?.attributes ?? [];
      const currentComponentNestedCompos = getComponentsNestedWithinComponent(
        componentAttributes,
        current as UID.Component
      );
      return [...acc, ...currentComponentNestedCompos];
    },
    []
  );

  return mergeComponents(nestedComponents);
};

const getComponentsNestedWithinComponent = (
  componentAttributes: Component['attributes'],
  parentCompoUid: UID.Component
) => {
  return componentAttributes.reduce((acc: RawNestedComponent[], current) => {
    const { type } = current;

    if (type === 'component') {
      acc.push({
        component: current.component,
        parentCompoUid,
      });
    }

    if (type === 'dynamiczone' && 'components' in current && current.components) {
      for (const dzComponentUid of current.components) {
        acc.push({
          component: dzComponentUid as UID.Component,
          parentCompoUid,
          isDzEdge: true,
        });
      }
    }

    return acc;
  }, []);
};

// Merge duplicate components
const mergeComponents = (originalComponents: RawNestedComponent[]): NestedComponent[] => {
  const componentMap = new Map();
  // Populate the map with component and its parents
  originalComponents.forEach(({ component, parentCompoUid, isDzEdge }) => {
    if (!componentMap.has(component)) {
      componentMap.set(component, { parents: new Set(), dzParents: new Set() });
    }
    const entry = componentMap.get(component)!;
    entry.parents.add(parentCompoUid);
    if (isDzEdge) {
      entry.dzParents.add(parentCompoUid);
    }
  });

  // Convert the map to the desired array format
  const transformedComponents: NestedComponent[] = Array.from(componentMap.entries()).map(
    ([component, { parents, dzParents }]) => ({
      component,
      uidsOfAllParents: Array.from(parents),
      dzParentUids: Array.from(dzParents),
    })
  );

  return transformedComponents;
};
