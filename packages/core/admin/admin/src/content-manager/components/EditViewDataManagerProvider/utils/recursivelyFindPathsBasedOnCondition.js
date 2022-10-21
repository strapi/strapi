/**
 * @typedef Attribute
 * @type { { type: string }}
 *
 * @typedef Attributes
 * @type {{ [key: string]: Attribute }}
 */

/**
 * This function will recursively find all the paths in the `currentContentTypeLayout.attributes`
 * based on the boolean return of the condition e.g. `type === 'relation'`.
 *
 * It's original use was for the preperation of action items for the INIT_FORM action. It requires
 * knowledge of the `components` in the entity, however `components` doesn't change nor does the predicate
 * function so we don't need to pass it everytime hence why it's curried.
 *
 *
 * @param {{[key: string]: { attributes: Attributes }}} components
 * @param {(value: Attribute) => boolean} predicate
 * @returns {(attributes: Attributes) => string[]}
 */
const recursivelyFindPathsBasedOnConditionSetup = (components, predicate = () => false) => {
  /**
   *
   * @param {Attributes} attributes
   * @returns {string[]}
   */
  const recursivelyFindPathsBasedOnCondition = (attributes) => {
    return Object.entries(attributes).reduce((acc, [key, value]) => {
      if (predicate(value)) {
        acc = [...acc, key];
      } else if (value.type === 'component') {
        const componentAttributes = components[value.component].attributes;

        const attributesInComponent = recursivelyFindPathsBasedOnCondition(componentAttributes);

        const attributesInComponentPaths = attributesInComponent.map((path) => `${key}.${path}`);

        acc = [...acc, attributesInComponentPaths];
      } else if (value.type === 'dynamiczone') {
        const dynamicComponents = value.components;

        const attributesInDynamicComponents = dynamicComponents
          .flatMap((componentName) =>
            recursivelyFindPathsBasedOnCondition({
              [componentName]: { type: 'component', component: componentName },
            })
          )
          .map((path) => `${key}.${path}`);

        acc = [...acc, attributesInDynamicComponents];
      }

      return acc.flat();
    }, []);
  };

  return recursivelyFindPathsBasedOnCondition;
};

export { recursivelyFindPathsBasedOnConditionSetup as recursivelyFindPathsBasedOnCondition };
