import axios from 'axios';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchMarketplacePlugins = async ({ sort = 'name:asc' } = null) => {
  const { data: response } = await axios.get(`${MARKETPLACE_API_URL}/plugins`, {
    params: {
      sort,
    },
  });

  // Only keep v4 plugins
  const filteredResponse = {
    ...response,
    data: response.data.filter((plugin) => plugin.attributes.strapiCompatibility === 'v4'),
  };

  return filteredResponse;
};

export { fetchMarketplacePlugins };
