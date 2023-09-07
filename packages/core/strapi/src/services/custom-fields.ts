import type { Strapi } from '@strapi/typings';
import { CustomFields } from '../types';

const createCustomFields = (strapi: Strapi): CustomFields => {
  return {
    register(customField) {
      strapi.container.get('custom-fields').add(customField);
    },
  };
};

export default createCustomFields;
