import * as React from 'react';

import { useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useNotifyAT } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { GetFolders } from '../../../shared/contracts/folders';
import { pluginId } from '../pluginId';

import type { Query } from '../../../shared/contracts/files';

interface UseFoldersOptions {
  enabled?: boolean;
  query?: Query;
}

export const useFolders = ({ enabled = true, query = {} }: UseFoldersOptions = {}) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { notifyStatus } = useNotifyAT();
  const { folder, _q, ...paramsExceptFolderAndQ } = query;
  const { get } = useFetchClient();

  let params: Query;

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

  const { data, error, isLoading } = useQuery<
    GetFolders.Response['data'],
    GetFolders.Response['error']
  >(
    [pluginId, 'folders', stringify(params)],
    async () => {
      const {
        data: { data },
      } = await get<GetFolders.Response>('/upload/folders', { params });

      return data;
    },
    {
      enabled,
      staleTime: 0,
      cacheTime: 0,
      onError() {
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error' }),
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
