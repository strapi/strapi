'use strict';

/**
 * Create a permission
 * @param {Object} attributes - permission attributes
 */
function createPermission(attributes) {
  return {
    ...attributes,
    action: attributes.action || null,
    subject: attributes.subject || null,
    conditions: attributes.conditions || [],
    fields: attributes.fields || null,
  };
}

module.exports = {
  createPermission,
};
