import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

import type { Component, AttributeType, Components } from '../../../types';

const retrieveComponentsThatHaveComponents = (allComponents: Components) => {
  const componentsThatHaveNestedComponents = Object.keys(allComponents).reduce(
    (acc: any, current) => {
      const currentComponent = get(allComponents, [current]);

      const compoWithChildren = getComponentWithChildComponents(currentComponent);
      if (compoWithChildren.childComponents.length > 0) {
        acc.push(compoWithChildren);
      }

      return acc;
    },
    []
  );

  return makeUnique(componentsThatHaveNestedComponents);
};

const getComponentWithChildComponents = (component: Component) => {
  const attributes = get(component, ['schema', 'attributes'], []) as AttributeType[];
  return {
    component: component.uid,
    childComponents: attributes.filter((attribute) => {
      const { type } = attribute;

      return type === 'component';
    }),
  };
};

export { getComponentWithChildComponents, retrieveComponentsThatHaveComponents };
