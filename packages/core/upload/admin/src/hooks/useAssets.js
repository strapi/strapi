import { stringify } from 'qs';
import { useQuery } from 'react-query';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

import pluginId from '../pluginId';
import { axiosInstance, getRequestUrl } from '../utils';

export const useAssets = ({ skipWhen = false, query = {} } = {}) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const dataRequestURL = getRequestUrl('files');
  const { folder, ...paramsExceptFolder } = query;
  const params = {
    ...paramsExceptFolder,
    filters: {
      $and: [
        ...(query?.filters?.$and ?? []),
        {
          folder: {
            id: query?.folder ?? {
              $null: true,
            },
          },
        },
      ],
    },
  };

  const getAssets = async () => {
    try {
      const { data } = await axiosInstance.get(
        `${dataRequestURL}?${stringify(params, { encode: false })}`
      );

      notifyStatus(
        formatMessage({
          id: 'list.asset.at.finished',
          defaultMessage: 'The assets have finished loading.',
        })
      );

      return data;
    } catch (err) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      throw err;
    }
  };

  const { data, error, isLoading } = useQuery([pluginId, 'assets', stringify(params)], getAssets, {
    enabled: !skipWhen,
    staleTime: 0,
    cacheTime: 0,
  });

  return { data, error, isLoading };
};
