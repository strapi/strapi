import type { ComponentWithChildren } from '../components/DataManager/utils/retrieveComponentsThatHaveComponents';
import type { NestedComponent } from '../components/DataManager/utils/retrieveNestedComponents';
import type { Components } from '../types';
import type { Internal } from '@strapi/types';

const findComponent = <T extends { component: Internal.UID.Component }>(
  componentUid: Internal.UID.Schema,
  components: Array<T>
) => {
  return components.find((c) => c.component === componentUid);
};

/**
 * Recursively calculates the maximum depth of nested child components
 * for a given component UID.
 *
 * @param componentUid - The UID of the component to start from.
 * @param components - The array of all components with their child components.
 * @param currentDepth - The current depth of the recursion. Defaults to 0.
 * @returns The maximum depth of the nested child components.
 */
export const getChildrenMaxDepth = (
  componentUid: Internal.UID.Component,
  components: Array<ComponentWithChildren>,
  currentDepth = 0
) => {
  const component = findComponent(componentUid, components);

  // If the component doesn't exist or has no child components, return the current depth.
  if (!component || !component.childComponents || component.childComponents.length === 0) {
    return currentDepth;
  }

  let maxDepth = currentDepth;

  // Iterate through each child component to calculate their respective depths.
  component.childComponents.forEach((child) => {
    // Recursively calculate the depth of the child component.
    const depth = getChildrenMaxDepth(child.component, components, currentDepth + 1);
    // Update the maximum depth if the child's depth is greater.
    if (depth > maxDepth) {
      maxDepth = depth;
    }
  });

  return maxDepth;
};

/**
 * Returns the dynamic zone nesting depth for a component.
 *
 * Counts the maximum number of dynamiczone-type edges in any path from a root
 * component down to the given component within the component graph.
 *
 * Examples:
 * - ComponentA -> (component) -> ComponentB: getDzDepth(B) = 0
 * - ComponentA -> (dz) -> ComponentB: getDzDepth(B) = 1
 * - ComponentA -> (dz) -> ComponentB -> (component) -> ComponentC: getDzDepth(C) = 1
 * - ComponentA -> (dz) -> ComponentB -> (dz) -> ComponentC: getDzDepth(C) = 2
 *
 * @param component - The UID of the component to check.
 * @param components - The array of all nested components (from retrieveNestedComponents).
 * @returns The number of dynamiczone transitions in the deepest parent chain.
 */
export const getDzDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
): number => {
  const inStack = new Set<Internal.UID.Schema>();

  const walk = (uid: Internal.UID.Schema): number => {
    // Cycle guard
    if (inStack.has(uid)) return 0;

    const comp = findComponent(uid, components);
    if (!comp) return 0;

    inStack.add(uid);

    let maxDepth = 0;

    if (comp.uidsOfAllParents) {
      const dzParents = new Set(comp.dzParentUids ?? []);

      for (const parentUid of comp.uidsOfAllParents) {
        const isDzEdge = dzParents.has(parentUid);
        const parentDepth = walk(parentUid);
        const depth = parentDepth + (isDzEdge ? 1 : 0);
        if (depth > maxDepth) {
          maxDepth = depth;
        }
      }
    }

    inStack.delete(uid);
    return maxDepth;
  };

  return walk(component);
};

/**
 * Returns the maximum number of dynamic-zone edges reachable by walking
 * *downward* through a component's attributes.
 *
 * - Component-type attributes are traversed without incrementing the counter.
 * - Dynamic-zone attributes increment the counter by 1 for each child.
 *
 * This is the mirror of `getDzDepth` (which walks upward through parents).
 *
 * @param componentUid - The UID of the component to inspect.
 * @param components   - The full component map (keyed by UID).
 * @param visited      - Cycle guard (internal).
 * @returns The deepest DZ chain below this component.
 */
export const getMaxDownwardDzDepth = (
  componentUid: Internal.UID.Component,
  components: Components,
  visited = new Set<Internal.UID.Component>()
): number => {
  if (visited.has(componentUid)) return 0;
  const comp = components[componentUid];
  if (!comp) return 0;

  visited.add(componentUid);
  let max = 0;

  for (const attr of comp.attributes) {
    if (attr.type === 'dynamiczone' && 'components' in attr && Array.isArray(attr.components)) {
      for (const childUid of attr.components) {
        const depth =
          1 +
          getMaxDownwardDzDepth(childUid as Internal.UID.Component, components, new Set(visited));
        if (depth > max) max = depth;
      }
    } else if (attr.type === 'component' && 'component' in attr) {
      const depth = getMaxDownwardDzDepth(
        attr.component as Internal.UID.Component,
        components,
        new Set(visited)
      );
      if (depth > max) max = depth;
    }
  }

  return max;
};

/**
 * Calculates the depth of a component within a nested component tree.
 * Depth is defined as the level at which the component is nested.
 * For example, a component at Depth 3 is the third nested component.
 *
 * @param component - The UID of the component to find the depth for.
 * @param components - The array of all nested components.
 * @returns The depth level of the component within the nested tree.
 */
export const getComponentDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
) => {
  /**
   * Helper function to recursively calculate the depth of a component.
   *
   * @param currentComponent - The current component being inspected.
   * @param currentLevel - The current level of depth in the tree.
   * @returns An array of depth levels found for the component.
   */
  const getDepth = (currentComponent: NestedComponent, currentLevel: number): Array<number> => {
    const levels = [];
    levels.push(currentLevel);

    // If the component has no parent UIDs, return the current levels
    if (!currentComponent.uidsOfAllParents) {
      return levels;
    }

    // Iterate over each parent UID to calculate their respective depths
    for (const parentUid of currentComponent.uidsOfAllParents) {
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
