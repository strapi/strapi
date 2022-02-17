import axios from 'axios';
import { axiosInstance } from '../../../core/utils';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const fetchPlugins = async notify => {
  const { data: response } = await axios.get(`${MARKETPLACE_API_URL}/plugins`);

  // Only keep v4 plugins
  const filteredResponse = {
    ...response,
    data: response.data.filter(plugin => plugin.attributes.strapiCompatibility === 'v4'),
  };

  notify();

  return filteredResponse;
};

const fetchInstalledPlugins = async notify => {
  const { data } = await axiosInstance.get('/admin/plugins');

  notify();

  return data;
};

export { fetchPlugins, fetchInstalledPlugins };
