import { get } from 'lodash';

const retrieveComponentsFromSchema = (attributes, allComponentsData) => {
  const allComponents = Object.keys(attributes).reduce((acc, current) => {
    const type = get(attributes, [current, 'type'], '');

    if (type === 'component') {
      const currentComponentName = attributes[current].component;
      // Push the existing compo
      acc.push(currentComponentName);

      const currentComponentAttributes = get(
        allComponentsData,
        [currentComponentName, 'schema', 'attributes'],
        {}
      );

      // Retrieve the nested ones
      acc.push(
        ...retrieveComponentsFromSchema(
          currentComponentAttributes,
          allComponentsData
        )
      );
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
