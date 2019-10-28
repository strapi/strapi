'use strict';

/**
 * Returns the attribute keys of the component related attributes
 */
function getComponentAttributes(definition) {
  return Object.keys(definition.attributes).filter(key =>
    ['component', 'dynamiczone'].includes(definition.attributes[key].type)
  );
}

const isComponent = (def, key) =>
  ['component', 'dynamiczone'].includes(def.attributes[key].type);

module.exports = {
  getComponentAttributes,
  isComponent,
};
