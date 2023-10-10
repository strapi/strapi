import * as React from 'react';

import { useNotifyAT } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import pluginId from '../pluginId';

export const useFolders = ({ enabled = true, query = {} } = {}) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const { folder, _q, ...paramsExceptFolderAndQ } = query;
  const { get } = useFetchClient();

  let params;

  if (_q) {
    params = {
      ...paramsExceptFolderAndQ,
      pagination: {
        pageSize: -1,
      },
      _q,
    };
  } else {
    params = {
      ...paramsExceptFolderAndQ,
      pagination: {
        pageSize: -1,
      },
      filters: {
        $and: [
          ...(paramsExceptFolderAndQ?.filters?.$and ?? []),
          {
            parent: {
              id: folder ?? {
                $null: true,
              },
            },
          },
        ],
      },
    };
  }

  const { data, error, isLoading } = useQuery(
    [pluginId, 'folders', stringify(params)],
    async () => {
      const {
        data: { data },
      } = await get('/upload/folders', { params });

      return data;
    },
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
    }
  );

  React.useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: 'list.asset.at.finished',
          defaultMessage: 'The folders have finished loading.',
        })
      );
    }
  }, [data, formatMessage, notifyStatus]);

  return { data, error, isLoading };
};
