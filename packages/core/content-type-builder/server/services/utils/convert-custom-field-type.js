'use strict';

/**
 * @description
 * Sets attribute.type to customField
 * @param {object} attributes Attributes found on content-type or component
 */
const convertCustomFieldType = attributes => {
  Object.values(attributes).forEach(attribute => {
    if (attribute.customField) {
      if (['component', 'relation', 'dynamiczone'].includes(attribute.type)) {
        // When the registered custom fiel is using an invalid strapi type
        throw new Error(`Type: ${attribute.type} is not a valid Custom Field type`);
      }
      // Use the custom field uid sent from the admin to get its equivalent on the server
      // The getter will throw an error if the custom field is not found
      const customField = strapi.container.get('custom-fields').get(attribute.customField);

      if (customField.type !== attribute.type) {
        // When there is a type mismatch between admin and server
        throw new Error(
          `Custom field: "${attribute.customField}" sent type: "${attribute.type}" from the admin but the server expected type: "${customField.type}"`
        );
      }

      attribute.type = 'customField';
    }
  });
};

module.exports = convertCustomFieldType;
