import type { NestedComponent } from '../components/DataManagerProvider/utils/retrieveNestedComponents';
import type { Internal } from '@strapi/types';

type ChildComponent = {
  repeatable: boolean;
  component: Internal.UID.Component;
  name?: string;
  required?: boolean;
  min?: number;
};

type Component = {
  component: Internal.UID.Component;
  childComponents: ChildComponent[];
};

const findComponent = <T extends { component: Internal.UID.Component }>(
  componentName: Internal.UID.Schema,
  components: Array<T>
) => {
  return components.find((c) => c.component === componentName);
};

/**
 * gets the maximum depth child component
 * for a specific component
 */
export const getChildrenMaxDepth = (
  componentUid: Internal.UID.Component,
  components: Array<Component>,
  currentDepth = 0
) => {
  const component = findComponent(componentUid, components);
  if (!component || !component.childComponents || component.childComponents.length === 0) {
    return currentDepth;
  }

  let maxDepth = currentDepth;
  component.childComponents.forEach((child) => {
    const depth = getChildrenMaxDepth(child.component, components, currentDepth + 1);
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });

  return maxDepth;
};

// get the current component depth
export const getComponentDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
) => {
  const getDepth = (currentComponent: NestedComponent, currentLevel: number): Array<number> => {
    const levels = [];
    levels.push(currentLevel);

    if (!currentComponent.parentCompoUid) {
      return levels;
    }

    for (const parentUid of currentComponent.parentCompoUid) {
      const parentComponent = findComponent(parentUid, components);
      if (parentComponent) {
        levels.push(...getDepth(parentComponent, currentLevel + 1));
      }
    }

    return levels;
  };

  const nestedCompo = findComponent(component, components);
  // return depth 0 if component is not nested
  if (!nestedCompo) {
    return 0;
  }
  const compoDepth = Math.max(...getDepth(nestedCompo, 1));
  return compoDepth;
};
