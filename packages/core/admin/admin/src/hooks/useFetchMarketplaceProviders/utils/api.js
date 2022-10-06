import axios from 'axios';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplacePlugins = async ({ sort = 'name:asc' } = null) => {
  const { data } = await axios.get(`${MARKETPLACE_API_URL}/providers`, {
    params: {
      sort,
    },
  });

  return data;
};

export { fetchMarketplacePlugins };
