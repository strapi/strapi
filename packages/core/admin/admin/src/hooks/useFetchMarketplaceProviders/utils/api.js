import axios from 'axios';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplacePlugins = async () => {
  const { data } = await axios.get(`${MARKETPLACE_API_URL}/providers`);

  return data;
};

export { fetchMarketplacePlugins };
