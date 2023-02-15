import { useQuery } from 'react-query';
import { useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';
import { fetchEnabledPlugins } from './utils/api';

const useFetchEnabledPlugins = (notifyLoad) => {
  const toggleNotification = useNotification();
  const { formatAPIError } = useAPIErrorHandler();

  return useQuery('list-enabled-plugins', () => fetchEnabledPlugins(), {
    onSuccess() {
      if (notifyLoad) {
        notifyLoad();
      }
    },
    onError(error) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(error),
      });
    },
  });
};

export default useFetchEnabledPlugins;
