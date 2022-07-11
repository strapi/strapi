'use strict';

const createCustomFields = strapi => {
  return {
    register(customField) {
      strapi.container.get('custom-fields').add(customField);
    },
  };
};

module.exports = createCustomFields;
