import type { Strapi, CustomFields } from '@strapi/typings';

const createCustomFields = (strapi: Strapi): CustomFields.CustomFields => {
  return {
    register(customField) {
      strapi.container.get('custom-fields').add(customField);
    },
  };
};

export default createCustomFields;
