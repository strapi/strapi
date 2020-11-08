import { get } from 'lodash';
import makeUnique from '../../../utils/makeUnique';

const retrieveComponentsThatHaveComponents = allComponents => {
  const componentsThatHaveNestedComponents = Object.keys(allComponents).reduce(
    (acc, current) => {
      const currentComponent = get(allComponents, [current], {});
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

const doesComponentHaveAComponentField = component => {
  const attributes = get(component, ['schema', 'attributes'], {});

  return Object.keys(attributes).some(attributeName => {
    const type = get(attributes, [attributeName, 'type'], '');

    return type === 'component';
  });
};

export {
  doesComponentHaveAComponentField,
  retrieveComponentsThatHaveComponents,
};
