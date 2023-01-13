import axios from 'axios';
import qs from 'qs';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplacePlugins = async (params = {}) => {
  const { data } = await axios.get(`${MARKETPLACE_API_URL}/plugins`, {
    params,
    paramsSerializer: {
      encode: qs.parse,
      serialize: qs.stringify,
    },
  });

  return data;
};

export { fetchMarketplacePlugins };
