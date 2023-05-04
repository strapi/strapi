import { getFetchClient } from '@strapi/helper-plugin';
import qs from 'qs';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';
const { get } = getFetchClient();

const fetchMarketplaceProviders = async (params = {}) => {
  const { data } = await get(`${MARKETPLACE_API_URL}/providers`, {
    params,
    paramsSerializer: {
      encode: qs.parse,
      serialize: qs.stringify,
    },
  });

  return data;
};

export { fetchMarketplaceProviders };
