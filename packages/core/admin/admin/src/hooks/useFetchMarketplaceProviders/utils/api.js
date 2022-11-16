import axios from 'axios';
import qs from 'qs';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplaceProviders = async (params = {}) => {
  const { data } = await axios.get(`${MARKETPLACE_API_URL}/providers`, {
    params,
    paramsSerializer: (params) => qs.stringify(params),
  });

  return data;
};

export { fetchMarketplaceProviders };
