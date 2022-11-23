import axios from 'axios';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplaceProviders = async (params = {}) => {
  const { data } = await axios.get(`${MARKETPLACE_API_URL}/providers`, {
    params,
  });

  return data;
};

export { fetchMarketplaceProviders };
