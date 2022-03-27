import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchMarketplacePlugins } from './utils/api';

const useFetchMarketplacePlugins = notifyLoad => {
  const toggleNotification = useNotification();

  return useQuery('list-marketplace-plugins', () => fetchMarketplacePlugins(), {
    onSuccess: () => {
      if (notifyLoad) {
        notifyLoad();
      }
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occurred' },
      });
    },
  });
};

export default useFetchMarketplacePlugins;
