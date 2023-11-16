import { mapValues } from 'lodash/fp';
import { PROVIDER_REDIRECT_ERROR, PROVIDER_REDIRECT_SUCCESS } from './constants';

const PROVIDER_URLS_MAP = {
  success: PROVIDER_REDIRECT_SUCCESS,
  error: PROVIDER_REDIRECT_ERROR,
};

export const getAdminStore = async () => strapi.store({ type: 'core', name: 'admin' });

export const getPrefixedRedirectUrls = () => {
  const { url: adminUrl } = strapi.config.get('admin') as any;
  const prefixUrl = (url: string) => `${adminUrl || '/admin'}${url}`;

  return mapValues(prefixUrl, PROVIDER_URLS_MAP);
};

export default {
  getAdminStore,
  getPrefixedRedirectUrls,
};
