import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { fetchMarketplacePlugins } from './utils/api';

const useFetchMarketplacePlugins = title => {
  const toggleNotification = useNotification();

  const { notifyStatus } = useNotifyAT();
  const notifyLoad = () => {
    notifyStatus(title);
  };

  return useQuery('list-marketplace-plugins', () => fetchMarketplacePlugins(notifyLoad), {
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });
};

export default useFetchMarketplacePlugins;
