import axios from 'axios';

const fetchPlugins = async notify => {
  const { data: response } = await axios.get(
    `${process.env.STRAPI_ADMIN_MARKETPLACE_API_URL}/plugins`
  );

  // Only keep v4 plugins
  const filteredResponse = {
    ...response,
    data: response.data.filter(plugin => plugin.attributes.strapiCompatibility === 'v4'),
  };

  notify();

  return filteredResponse;
};

export { fetchPlugins };
