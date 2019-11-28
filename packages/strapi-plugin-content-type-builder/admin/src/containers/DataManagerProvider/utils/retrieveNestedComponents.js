import { get } from 'lodash';

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

  return nestedComponents.filter(
    (compo, index) => nestedComponents.indexOf(compo) === index
  );
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
