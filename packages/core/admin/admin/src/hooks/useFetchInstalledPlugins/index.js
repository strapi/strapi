import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchInstalledPlugins } from './utils/api';

const useFetchInstalledPlugins = notifyLoad => {
  const toggleNotification = useNotification();

  return useQuery('list-installed-plugins', () => fetchInstalledPlugins(), {
    onSuccess: () => {
      if (notifyLoad) {
        notifyLoad();
      }
    },
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });
};

export default useFetchInstalledPlugins;
