import { get } from 'lodash';

const retrieveComponentsFromSchema = attributes => {
  const allComponents = Object.keys(attributes).reduce((acc, current) => {
    const type = get(attributes, [current, 'type'], '');

    if (type === 'component') {
      acc.push(attributes[current].component);
    }

    if (type === 'dynamiczone') {
      return [...acc, ...attributes[current].components];
    }

    return acc;
  }, []);

  return allComponents.filter(
    (componentName, index) => allComponents.indexOf(componentName) === index
  );
};

export default retrieveComponentsFromSchema;
