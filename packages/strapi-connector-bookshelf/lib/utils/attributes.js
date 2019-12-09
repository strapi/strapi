'use strict';

const { get } = require('lodash');

/**
 * Returns the attribute keys of the component related attributes
 */
function getComponentAttributes(definition) {
  return Object.keys(definition.attributes).filter(key =>
    ['component', 'dynamiczone'].includes(definition.attributes[key].type)
  );
}

const isComponent = (def, key) => {
  const type = get(def, ['attributes', key, 'type']);
  return ['component', 'dynamiczone'].includes(type);
};

module.exports = {
  getComponentAttributes,
  isComponent,
};
