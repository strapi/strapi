import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import qs from 'qs';
import { MARKETPLACE_API_URL } from '../constants';

const fetchMarketplacePlugins = async (params = {}) => {
  try {
    const queryString = qs.stringify(qs.parse(params));
    const res = await fetch(`${MARKETPLACE_API_URL}/plugins?${queryString}`);

    if (!res.ok) {
      throw new Error('Failed to fetch marketplace plugins.');
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error(error);
  }

  return null;
};

const useFetchMarketplacePlugins = (notifyLoad, params) => {
  const toggleNotification = useNotification();

  return useQuery(['list-marketplace-plugins', params], () => fetchMarketplacePlugins(params), {
    onSuccess() {
      if (notifyLoad) {
        notifyLoad();
      }
    },
    onError() {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });
};

export default useFetchMarketplacePlugins;
