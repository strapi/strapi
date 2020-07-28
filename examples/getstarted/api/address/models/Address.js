'use strict';

/**
 * Lifecycle callbacks for the `Address` model.
 */

module.exports = {
  lifecycles: {
    afterFind(result) {
      // update array of results
      result = result.map(strapi.services.address.setTitle);
    },
    afterFindOne(result) {
      // update one item
      strapi.services.address.setTitle(result);
    },
  },
};
