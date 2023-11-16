import { useNotifyAT } from '@strapi/design-system';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { getTranslation } from '../utils/getTranslation';

import type { GetISOLocales } from '../../../shared/contracts/iso-locales';

const useDefaultLocales = () => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { get } = useFetchClient();
  const { isLoading, data } = useQuery(
    ['plugin-i18n', 'locales'],
    async () => {
      const { data } = await get<GetISOLocales.Response>('/i18n/iso-locales');

      if (Array.isArray(data)) {
        return data;
      } else {
        /**
         * We have to do this because the API could return an error or an array and while we expect
         * the error to only return when the request fails, you can never be too sure.
         */
        throw new Error('The response is not an array.');
      }
    },
    {
      onSuccess() {
        notifyStatus(
          formatMessage({
            id: getTranslation('Settings.locales.modal.locales.loaded'),
            defaultMessage: 'The locales have been successfully loaded.',
          })
        );
      },
      onError() {
        toggleNotification({
          type: 'warning',
          message: { id: 'notification.error' },
        });
      },
      initialData: [],
    }
  );

  return { defaultLocales: data, isLoading };
};

export { useDefaultLocales };
