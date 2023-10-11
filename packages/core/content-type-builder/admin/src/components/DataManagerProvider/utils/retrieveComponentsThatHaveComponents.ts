import get from 'lodash/get';

import { makeUnique } from '../../../utils/makeUnique';

import type { Component, Schema } from '../../../types';
import type { UID } from '@strapi/types';

const retrieveComponentsThatHaveComponents = (allComponents: any) => {
  const componentsThatHaveNestedComponents = Object.keys(allComponents).reduce((acc, current) => {
    const currentComponent: Component = get(allComponents, [current], {});
    const uid = currentComponent.uid;

    if (doesComponentHaveAComponentField(currentComponent)) {
      acc.push(uid);
    }

    return acc;
  }, []);

  return makeUnique(componentsThatHaveNestedComponents);
};

const doesComponentHaveAComponentField = (component: Component) => {
  const attributes = get(component, ['schema', 'attributes'], []);

  return attributes.some((attribute) => {
    const { type } = attribute;

    return type === 'component';
  });
};

export { doesComponentHaveAComponentField, retrieveComponentsThatHaveComponents };
