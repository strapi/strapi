import axios from 'axios';

const fetchPlugins = async notify => {
  const { data } = await axios.get(`${process.env.STRAPI_ADMIN_MARKETPLACE_API_URL}/plugins`);

  notify();

  return data;
};

export { fetchPlugins };
