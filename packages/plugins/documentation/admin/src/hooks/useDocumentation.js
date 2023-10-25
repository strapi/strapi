import { useEffect } from 'react';

import { useFetchClient, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';
import { useMutation, useQuery } from 'react-query';

import pluginId from '../pluginId';
import getTrad from '../utils/getTrad';

export const useDocumentation = () => {
  const toggleNotification = useNotification();
  const { del, post, put, get } = useFetchClient();

  const { formatAPIError } = useAPIErrorHandler();

  const { isLoading, isError, data, refetch, error } = useQuery(
    ['get-documentation', pluginId],
    async () => {
      const { data } = await get(`/${pluginId}/getInfos`);

      return data;
    }
  );

  useEffect(() => {
    if (isError && error) {
      toggleNotification({
        type: 'warning',
        message: error ? formatAPIError(error) : { id: 'notification.error' },
      });
    }
  }, [isError, error, toggleNotification, formatAPIError]);

  const handleError = (err) => {
    toggleNotification({
      type: 'warning',
      message: formatAPIError(err),
    });
  };

  const handleSuccess = (type, tradId, defaultMessage) => {
    refetch();
    toggleNotification({
      type,
      message: { id: getTrad(tradId), defaultMessage },
    });
  };

  const deleteMutation = useMutation(
    ({ prefix, version }) => del(`${prefix}/deleteDoc/${version}`),
    {
      onSuccess: () =>
        handleSuccess('info', 'notification.delete.success', 'Successfully deleted documentation'),
      onError: handleError,
    }
  );

  const submit = useMutation(({ prefix, body }) => put(`${prefix}/updateSettings`, body), {
    onSuccess: () =>
      handleSuccess('success', 'notification.update.success', 'Successfully updated settings'),
    onError: handleError,
  });

  const regenerate = useMutation(
    ({ prefix, version }) => post(`${prefix}/regenerateDoc`, { version }),
    {
      onSuccess: () =>
        handleSuccess(
          'info',
          'notification.generate.success',
          'Successfully generated documentation'
        ),
      onError: handleError,
    }
  );

  return { data, isLoading, isError, remove: deleteMutation, submit, regenerate };
};
