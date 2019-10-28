'use strict';

/**
 * Returns the attribute keys of the component related attributes
 */
function getComponentAttributes(attributes) {
  return Object.keys(attributes).filter(key =>
    ['component', 'dynamiczone'].includes(attributes[key].type)
  );
}

module.exports = {
  getComponentAttributes,
};
