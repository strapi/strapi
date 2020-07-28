'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/services.html#core-services)
 * to customize this service
 */

module.exports = {
  setTitle(data) {
    const { city, postal_coder } = data;
    data.title = [city, postal_coder].filter(Boolean).join(' ');
    console.log(data);
    // we need to return data, because we will update array of entities with map
    return data;
  },
};
