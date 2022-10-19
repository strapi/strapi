/**
 * @typedef Attributes
 * @type {{ [key: string]: { type: string } }}
 */

/**
 * This function will recursively find all the relation paths in the `currentContentTypeLayout.attributes`
 * in preperation for the INIT_FORM action. It requires knowledge of the `components` in the entity,
 * however `components` doesn't change so we don't need to pass it everytime hence why it's curried, `components`
 * is therefore closured for the recursive calls of the `Attributes`.
 *
 *
 * @param {{[key: string]: { attributes: Attributes }}} components
 * @returns {(attributes: Attributes) => string[]}
 */
const recursivelyFindRelationPathsSetup = (components) => {
  /**
   *
   * @param {Attributes} attributes
   * @returns {string[]}
   */
  const recursivelyFindRelationPaths = (attributes) => {
    return Object.entries(attributes).reduce((acc, [key, value]) => {
      if (value.type === 'relation') {
        acc = [...acc, key];
      } else if (value.type === 'component') {
        const componentAttributes = components[value.component].attributes;

        const relationalAttributesInComponent = recursivelyFindRelationPaths(componentAttributes);

        const relationalAttributesInComponentPaths = relationalAttributesInComponent.map(
          (path) => `${key}.${path}`
        );

        acc = [...acc, relationalAttributesInComponentPaths];
      }

      return acc.flat();
    }, []);
  };

  return recursivelyFindRelationPaths;
};

export { recursivelyFindRelationPathsSetup as recursivelyFindRelationPaths };
