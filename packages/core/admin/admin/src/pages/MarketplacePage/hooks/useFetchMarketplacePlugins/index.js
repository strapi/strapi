import { useNotification } from '@strapi/helper-plugin';
import qs from 'qs';
import { useQuery } from 'react-query';

import { MARKETPLACE_API_URL } from '../../constants';

export const useFetchMarketplacePlugins = (notifyLoad, params = {}) => {
  const toggleNotification = useNotification();

  return useQuery(
    ['marketplace', 'plugins', params],
    async () => {
      try {
        const queryString = qs.stringify(qs.parse(params));
        const res = await fetch(`${MARKETPLACE_API_URL}/plugins?${queryString}`);

        if (!res.ok) {
          throw new Error('Failed to fetch marketplace plugins.');
        }

        const data = await res.json();

        return data;
      } catch (error) {
        // silence
      }

      return null;
    },
    {
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
    }
  );
};
