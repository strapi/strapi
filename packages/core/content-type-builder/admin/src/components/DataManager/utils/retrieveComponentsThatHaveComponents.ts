import get from 'lodash/get';

import type { AnyAttribute, Component, Components } from '../../../types';
import type { UID } from '@strapi/types';

type ChildComponent = {
  component: UID.Component;
};

export type ComponentWithChildren = {
  component: UID.Component;
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
  return {
    component: component.uid,
    childComponents: component.attributes
      .filter(
        (attribute: AnyAttribute): attribute is AnyAttribute & { component: UID.Component } => {
          const { type } = attribute;

          return type === 'component';
        }
      )
      .map((attribute) => {
        return {
          component: attribute.component,
        } as ChildComponent;
      }),
  };
};

export { getComponentWithChildComponents, retrieveComponentsThatHaveComponents };
