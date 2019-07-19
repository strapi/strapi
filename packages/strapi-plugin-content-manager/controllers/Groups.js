'use strict';

module.exports = {
  /**
   * Returns the list of available groups
   */
  listGroups() {},
  /**
   * Returns a group configuration.
   * It includes
   *  - schema
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  findGroup() {},
  /**
   * Updates a group configuration
   * You can only update the content-manager settings: (use the content-type-builder to update attributes)
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  updatrGroup() {},
};
