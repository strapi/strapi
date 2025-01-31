import get from 'lodash/get';

import type { Component, AttributeType, Components } from '../../../types';
import type { Internal } from '@strapi/types';

type ChildComponent = {
  component: Internal.UID.Component;
};

export type ComponentWithChildren = {
  component: Internal.UID.Component;
  childComponents: ChildComponent[];
};

const retrieveComponentsThatHaveComponents = (allComponents: Components) => {
  const componentsThatHaveNestedComponents = Object.keys(allComponents).reduce(
    (acc: ComponentWithChildren[], current) => {
      const currentComponent = get(allComponents, [current]);

      const compoWithChildren = getComponentWithChildComponents(currentComponent);
      if (compoWithChildren.childComponents.length > 0) {
        acc.push(compoWithChildren);
      }

      return acc;
    },
    []
  );

  return componentsThatHaveNestedComponents;
};

const getComponentWithChildComponents = (component: Component): ComponentWithChildren => {
  const attributes = get(component, ['schema', 'attributes'], []) as AttributeType[];
  return {
    component: component.uid,
    childComponents: attributes
      .filter((attribute) => {
        const { type } = attribute;

        return type === 'component';
      })
      .map((attribute) => {
        return {
          component: attribute.component,
        } as ChildComponent;
      }),
  };
};

export { getComponentWithChildComponents, retrieveComponentsThatHaveComponents };
