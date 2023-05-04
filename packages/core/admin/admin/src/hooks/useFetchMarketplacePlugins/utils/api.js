import { getFetchClient } from '@strapi/helper-plugin';
import qs from 'qs';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';
const { get } = getFetchClient();

const fetchMarketplacePlugins = async (params = {}) => {
  const { data } = await get(`${MARKETPLACE_API_URL}/plugins`, {
    params,
    paramsSerializer: {
      encode: qs.parse,
      serialize: qs.stringify,
    },
  });

  return data;
};

export { fetchMarketplacePlugins };
