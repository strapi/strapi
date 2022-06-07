import { stringify } from 'qs';
import { useQuery } from 'react-query';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

export const useFolders = ({ enabled = true, query = {} }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const dataRequestURL = getRequestUrl('folders');
  const { folder, ...paramsExceptFolder } = query;
  const params = {
    ...paramsExceptFolder,
    pagination: {
      pageSize: -1,
    },
    filters: {
      ...query?.filters,
      parent: {
        id: query?.folder ?? {
          $null: true,
        },
      },
    },
  };

  const fetchFolders = async () => {
    try {
      const { data } = await axiosInstance.get(`${dataRequestURL}?${stringify(params)}`);

      notifyStatus(
        formatMessage({
          id: 'list.asset.at.finished',
          defaultMessage: 'The folders have finished loading.',
        })
      );

      return data.data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      throw err;
    }
  };

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folders', stringify(params)],
    fetchFolders,
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
    }
  );

  return { data, error, isLoading };
};
