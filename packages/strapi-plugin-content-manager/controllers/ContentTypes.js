'use strict';

module.exports = {
  /**
   * Returns the general content manager settings
   */
  getGeneralSettings() {},
  /**
   * Update the general content manager settings
   * and the content types settings imapcted by it
   */
  updateGeneralSettings() {},
  /**
   * Returns the list of available content types
   */
  listContentTypes() {},
  /**
   * Returns a content type configuration.
   * It includes
   *  - schema
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  findContentType() {},
  /**
   * Updates a content type configuration
   * You can only update the content-manager settings: (use the content-type-builder to update attributes)
   *  - content-manager layouts (list,edit)
   *  - content-manager settings
   *  - content-manager metadata (placeholders, description, label...)
   */
  updateContentType() {},
};
