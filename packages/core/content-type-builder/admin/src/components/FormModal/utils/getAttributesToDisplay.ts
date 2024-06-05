import { MAX_COMPONENT_DEPTH } from '../../../constants';

import type { IconByType } from '../../AttributeIcon';
import type { NestedComponent } from '../../DataManagerProvider/utils/retrieveNestedComponents';
import type { Internal } from '@strapi/types';

export const getAttributesToDisplay = (
  dataTarget = '',
  targetUid: Internal.UID.Schema,
  nestedComponents: Array<NestedComponent>
): IconByType[][] => {
  const defaultAttributes: IconByType[] = [
    'text',
    'boolean',
    'blocks',
    'json',
    'number',
    'email',
    'date',
    'password',
    'media',
    'enumeration',
    'relation',
    'richtext',
  ];

  const isPickingAttributeForAContentType = dataTarget === 'contentType';

  if (isPickingAttributeForAContentType) {
    return [
      // Insert UID before the last item (richtext)
      [...defaultAttributes.slice(0, -1), 'uid', ...defaultAttributes.slice(-1)],
      ['component', 'dynamiczone'],
    ];
  }

  // this will only run when adding attributes to components
  if (dataTarget) {
    const componentDepth = getComponentMaxDepth(targetUid, nestedComponents);
    const isNestedInAnotherComponent = componentDepth >= MAX_COMPONENT_DEPTH;
    const canAddComponentInAnotherComponent =
      !isPickingAttributeForAContentType && !isNestedInAnotherComponent;
    if (canAddComponentInAnotherComponent) {
      return [defaultAttributes, ['component']];
    }
  }

  return [defaultAttributes];
};

const findComponent = (component: Internal.UID.Schema, components: Array<NestedComponent>) => {
  return components.find((c) => c.component === component);
};

const getComponentMaxDepth = (
  component: Internal.UID.Schema,
  components: Array<NestedComponent>
) => {
  const dfs = (currentComponent: NestedComponent, currentLevel: number): Array<number> => {
    const levels = [];
    levels.push(currentLevel);

    if (!currentComponent.parentCompoUid) {
      return levels;
    }

    for (const parentUid of currentComponent.parentCompoUid) {
      const parentComponent = findComponent(parentUid, components);
      if (parentComponent) {
        levels.push(...dfs(parentComponent, currentLevel + 1));
      }
    }

    return levels;
  };

  const nestedCompo = findComponent(component, components);
  // return depth 0 if component is not nested
  if (!nestedCompo) {
    return 0;
  }
  const compoDepth = Math.max(...dfs(nestedCompo, 1));
  return compoDepth;
};
