import { useQuery } from 'react-query';
import { useFetchClient, useNotification } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const useDefaultLocales = () => {
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();
  const { get } = useFetchClient();
  const { isLoading, data } = useQuery(['plugin-i18n', 'locales'], async () => {
    try {
      const { data } = await get('/i18n/iso-locales');

      notifyStatus(
        formatMessage({
          id: getTrad('Settings.locales.modal.locales.loaded'),
          defaultMessage: 'The locales have been successfully loaded.',
        })
      );

      return data;
    } catch (e) {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });

      return [];
    }
  });

  return { defaultLocales: data, isLoading };
};

export default useDefaultLocales;
