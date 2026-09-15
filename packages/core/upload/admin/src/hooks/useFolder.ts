import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useQuery } from '@tanstack/react-query';
import { useIntl } from 'react-intl';

import { GetFolder } from '../../../shared/contracts/folders';
import { pluginId } from '../pluginId';
import { getTrad } from '../utils';

export const useFolder = (id: number | null | undefined, { enabled = true } = {}) => {
  const { toggleNotification } = useNotification();
  const { get } = useFetchClient();
  const { formatMessage } = useIntl();

  // v4: disabled queries report isLoading=true; isInitialLoading matches v3 isLoading.
  const {
    data,
    error,
    isInitialLoading: isLoading,
  } = useQuery<GetFolder.Response['data'], GetFolder.Response['error']>(
    [pluginId, 'folder', id],
    async () => {
      const {
        data: { data },
      } = await get<GetFolder.Response>(`/upload/folders/${id}`, {
        params: {
          populate: {
            parent: {
              populate: {
                parent: '*',
              },
            },
          },
        },
      });

      return data;
    },
    {
      retry: false,
      enabled,
      staleTime: 0,
      cacheTime: 0,
      onError() {
        toggleNotification({
          type: 'danger',
          message: formatMessage({
            id: getTrad('notification.warning.404'),
            defaultMessage: 'Not found',
          }),
        });
      },
    }
  );

  return { data, error, isLoading };
};
