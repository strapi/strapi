import { get } from 'lodash';
import makeUnique from '../../../utils/makeUnique';

const retrieveNestedComponents = appComponents => {
  const nestedComponents = Object.keys(appComponents).reduce((acc, current) => {
    const componentAttributes = get(
      appComponents,
      [current, 'schema', 'attributes'],
      {}
    );
    const currentComponentNestedCompos = getComponentsFromComponent(
      componentAttributes
    );

    return [...acc, ...currentComponentNestedCompos];
  }, []);

  return makeUnique(nestedComponents);
};

const getComponentsFromComponent = componentAttributes => {
  return Object.keys(componentAttributes).reduce((acc, current) => {
    const attribute = get(componentAttributes, current, {});
    const { type, component } = attribute;

    if (type === 'component') {
      acc.push(component);
    }

    return acc;
  }, []);
};

export default retrieveNestedComponents;
