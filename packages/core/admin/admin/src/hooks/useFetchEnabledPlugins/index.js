import { useQuery } from 'react-query';
import { useNotification } from '@strapi/helper-plugin';
import { fetchEnabledPlugins } from './utils/api';

const useFetchEnabledPlugins = notifyLoad => {
  const toggleNotification = useNotification();

  return useQuery('list-enabled-plugins', () => fetchEnabledPlugins(), {
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

export default useFetchEnabledPlugins;
