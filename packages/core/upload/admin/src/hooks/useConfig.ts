import { useTracking, useNotification, useFetchClient } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { useMutation, useQuery, UseQueryResult, UseMutationResult } from 'react-query';

import pluginId from '../pluginId';
import { GetConfiguration, UpdateConfiguration } from '../../../shared/contracts/configuration';

const endpoint = `/${pluginId}/configuration`;
const queryKey = [pluginId, 'configuration'];

export const useConfig = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { get, put } = useFetchClient();

  const config: UseQueryResult<
    GetConfiguration.Response['data']['data'] | GetConfiguration.Response['error']
  > = useQuery(
    queryKey,
    async () => {
      const res: GetConfiguration.Response = await get(endpoint);
      return res.data.data;
    },
    {
      onError(error: GetConfiguration.Response['error']) {
        return toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error' }),
        });
      },
      /**
       * We're cementing that we always expect an object to be returned.
       */
      select: (data) => data || {},
    }
  );

  const putMutation: UseMutationResult<
    void,
    UpdateConfiguration.Response['error'],
    UpdateConfiguration.Request['body']
  > = useMutation(
    async (body: UpdateConfiguration.Request['body']) => {
      await put<UpdateConfiguration.Response>(endpoint, body);
    },
    {
      onSuccess() {
        trackUsage('didEditMediaLibraryConfig');
        config.refetch();
      },
      onError() {
        return toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error' }),
        });
      },
    }
  );

  return {
    config,
    mutateConfig: putMutation,
  };
};
