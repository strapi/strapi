import type { Strapi } from '../Strapi';
import { CustomFields } from '../types';

const createCustomFields = (strapi: Strapi): CustomFields => {
  return {
    register(customField) {
      strapi.container.get('custom-fields').add(customField);
    },
  };
};

export default createCustomFields;
