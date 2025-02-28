import { useStrapiApp } from '@strapi/admin/strapi-admin';

import type { FormsAPI } from '../utils/formAPI';

export const useFormsAPI = (): FormsAPI => {
  const getPlugin = useStrapiApp('content-type-builder', (state) => state.getPlugin);

  const ctbPlugin = getPlugin('content-type-builder');

  return ctbPlugin.apis.forms as FormsAPI;
};
