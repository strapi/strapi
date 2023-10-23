import { useNotification } from '@strapi/helper-plugin';
import qs from 'qs';
import { useQuery } from 'react-query';

import { MARKETPLACE_API_URL } from '../../constants';

export const useFetchMarketplaceProviders = (notifyLoad, params = {}) => {
  const toggleNotification = useNotification();

  return useQuery(
    ['marketplace', 'providers', params],
    async () => {
      try {
        const queryString = qs.stringify(qs.parse(params));
        const res = await fetch(`${MARKETPLACE_API_URL}/providers?${queryString}`);

        if (!res.ok) {
          throw new Error('Failed to fetch marketplace providers.');
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
