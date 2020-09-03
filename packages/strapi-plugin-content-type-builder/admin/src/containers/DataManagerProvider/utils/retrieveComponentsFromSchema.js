import { get } from 'lodash';
import makeUnique from '../../../utils/makeUnique';

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
      const dynamicZoneComponents = attributes[current].components;
      const componentsFromDZComponents = dynamicZoneComponents.reduce(
        (acc2, currentUid) => {
          const compoAttrs = get(
            allComponentsData,
            [currentUid, 'schema', 'attributes'],
            {}
          );

          return [
            ...acc2,
            ...retrieveComponentsFromSchema(compoAttrs, allComponentsData),
          ];
        },
        []
      );

      return [...acc, ...dynamicZoneComponents, ...componentsFromDZComponents];
    }

    return acc;
  }, []);

  return makeUnique(allComponents);
};

export default retrieveComponentsFromSchema;
