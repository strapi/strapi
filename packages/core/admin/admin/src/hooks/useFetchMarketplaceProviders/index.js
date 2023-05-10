import { useQuery } from 'react-query';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import qs from 'qs';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

const useFetchMarketplaceProviders = (notifyLoad, params) => {
  const toggleNotification = useNotification();
  const { get } = useFetchClient();
  const fetchMarketplaceProviders = async (params = {}) => {
    const { data } = await get(`${MARKETPLACE_API_URL}/providers`, {
      params,
      paramsSerializer: {
        encode: qs.parse,
        serialize: qs.stringify,
      },
    });
  
    return data;
  };

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
