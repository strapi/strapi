import * as React from 'react';

import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useNotifyAT } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { Query, GetFiles } from '../../../shared/contracts/files';
import { pluginId } from '../pluginId';

interface UseAssetsOptions {
  skipWhen?: boolean;
  query?: Query;
}

export const useAssets = ({ skipWhen = false, query = {} }: UseAssetsOptions = {}) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { notifyStatus } = useNotifyAT();
  const { get } = useFetchClient();
  const { folderPath, _q, ...paramsExceptFolderAndQ } = query;

  let params: Query;

  if (_q) {
    params = {
      ...paramsExceptFolderAndQ,
      _q: encodeURIComponent(_q),
    };
  } else {
    params = {
      ...paramsExceptFolderAndQ,
      filters: {
        $and: [
          ...(paramsExceptFolderAndQ?.filters?.$and ?? []),
          {
            folderPath: { $eq: folderPath ?? '/' },
          },
        ],
      },
    };
  }

  const { data, error, isLoading } = useQuery<
    GetFiles.Response['data'],
    GetFiles.Response['error']
  >(
    [pluginId, 'assets', params],
    async () => {
      const { data } = await get('/upload/files', { params });

      return data;
    },
    {
      enabled: !skipWhen,
      staleTime: 0,
      cacheTime: 0,
      select(data) {
        if (data?.results && Array.isArray(data.results)) {
          return {
            ...data,
            results: data.results
              /**
               * Filter out assets that don't have a name.
               * So we don't try to render them as assets
               * and get errors.
               */
              .filter((asset) => asset.name)
              .map((asset) => ({
                ...asset,
                /**
                 * Mime and ext cannot be null in the front-end because
                 * we expect them to be strings and use the `includes` method.
                 */
                mime: asset.mime ?? '',
                ext: asset.ext ?? '',
              })),
          };
        }

        return data;
      },
    }
  );

  React.useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: 'list.asset.at.finished',
          defaultMessage: 'The assets have finished loading.',
        })
      );
    }
  }, [data, formatMessage, notifyStatus]);

  React.useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'danger',
        message: formatMessage({ id: 'notification.error' }),
      });
    }
  }, [error, formatMessage, toggleNotification]);

  return { data, error, isLoading };
};
