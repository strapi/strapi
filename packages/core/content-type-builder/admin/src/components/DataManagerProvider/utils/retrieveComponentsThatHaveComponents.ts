import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

import type { Component, AttributeType, Components } from '../../../types';
import type { UID } from '@strapi/types';

const retrieveComponentsThatHaveComponents = (allComponents: Components) => {
  const componentsThatHaveNestedComponents = Object.keys(allComponents).reduce(
    (acc: UID.Component[], current) => {
      const currentComponent = get(allComponents, [current]);
      const uid = currentComponent.uid;

      if (doesComponentHaveAComponentField(currentComponent)) {
        acc.push(uid);
      }

      return acc;
    },
    []
  );

  return makeUnique(componentsThatHaveNestedComponents);
};

const doesComponentHaveAComponentField = (component: Component) => {
  const attributes = get(component, ['schema', 'attributes'], []) as AttributeType[];

  return attributes.some((attribute) => {
    const { type } = attribute;

    return type === 'component';
  });
};

export { doesComponentHaveAComponentField, retrieveComponentsThatHaveComponents };
