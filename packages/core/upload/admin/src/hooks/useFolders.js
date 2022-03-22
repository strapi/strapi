import { useEffect } from 'react';
import { useQuery } from 'react-query';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { useNotification, useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { axiosInstance, getRequestUrl } from '../utils';

export const useFolders = ({ enabled = true }) => {
  const { formatMessage } = useIntl();
  const toggleNotification = useNotification();
  const { notifyStatus } = useNotifyAT();
  const [{ rawQuery }] = useQueryParams();
  const dataRequestURL = getRequestUrl('folders');

  const fetchFolders = async () => {
    const { data } = await axiosInstance.get(`${dataRequestURL}${rawQuery}`);

    return data;
  };

  const { data, error, isLoading } = useQuery([`folders`, rawQuery], fetchFolders, {
    enabled,
    staleTime: 0,
    cacheTime: 0,
  });

  useEffect(() => {
    if (data) {
      notifyStatus(
        formatMessage({
          id: 'list.asset.at.finished',
          defaultMessage: 'The folders have finished loading.',
        })
      );
    }
  }, [data, notifyStatus, formatMessage]);

  useEffect(() => {
    if (error) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  }, [error, toggleNotification]);

  return { data, error, isLoading };
};
