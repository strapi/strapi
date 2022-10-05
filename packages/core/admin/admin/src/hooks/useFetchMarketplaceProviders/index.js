import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchMarketplaceProviders } from './utils/api';

const useFetchMarketplaceProviders = (notifyLoad) => {
  const toggleNotification = useNotification();

  return useQuery('list-marketplace-providers', () => fetchMarketplaceProviders(), {
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
