import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useQuery } from 'react-query';

export const usePlugins = (notifyLoad) => {
  const toggleNotification = useNotification();
  const { get } = useFetchClient();

  return useQuery(
    ['plugins'],
    async () => {
      const { data } = await get('/admin/plugins');

      return data;
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
