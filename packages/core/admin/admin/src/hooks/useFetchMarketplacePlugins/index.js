import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchMarketplacePlugins } from './utils/api';

const useFetchMarketplacePlugins = (notifyLoad, sort) => {
  const toggleNotification = useNotification();

  return useQuery(['list-marketplace-plugins', sort], () => fetchMarketplacePlugins({ sort }), {
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
