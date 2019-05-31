'use strict';

module.exports = {
  /**
   * Returns the list of existing groups
   */
  listGroups() {
    return Array.from(strapi.groupManager).map(([groupKey, schema]) => {
      return {
        id: groupKey,
        name: schema.name,
        schema: schema,
      };
    });
  },
};
