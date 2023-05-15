import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import qs from 'qs';
import { MARKETPLACE_API_URL } from '../constants';

const fetchMarketplaceProviders = async (params = {}) => {
  try {
    const queryString = qs.stringify(qs.parse(params));
    const res = await fetch(`${MARKETPLACE_API_URL}/providers?${queryString}`);

    if (!res.ok) {
      throw new Error('Failed to fetch marketplace providers.');
    }

    const data = await res.json();

    return data;
  } catch (error) {
    console.error(error);
  }

  return null;
};

const useFetchMarketplaceProviders = (notifyLoad, params) => {
  const toggleNotification = useNotification();

  return useQuery(['list-marketplace-providers', params], () => fetchMarketplaceProviders(params), {
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

export default useFetchMarketplaceProviders;
