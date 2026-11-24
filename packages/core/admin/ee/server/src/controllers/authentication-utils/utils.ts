import { mapValues } from 'lodash';

import { PROVIDER_REDIRECT_ERROR, PROVIDER_REDIRECT_SUCCESS } from './constants';

const PROVIDER_URLS_MAP = {
  success: PROVIDER_REDIRECT_SUCCESS,
  error: PROVIDER_REDIRECT_ERROR,
};

export const getAdminStore = async () => strapi.store({ type: 'core', name: 'admin' });

export const getPrefixedRedirectUrls = () => {
  const { url: adminUrl } = strapi.config.get('admin') as any;
  const prefixUrl = (url: string) => `${adminUrl || '/admin'}${url}`;

  return mapValues(PROVIDER_URLS_MAP, (value) => prefixUrl(value));
};

export default {
  getAdminStore,
  getPrefixedRedirectUrls,
};
