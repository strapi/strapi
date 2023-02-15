import { useQuery } from 'react-query';
import { request, useNotification, useAPIErrorHandler } from '@strapi/helper-plugin';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { useIntl } from 'react-intl';
import { getTrad } from '../../utils';

const useDefaultLocales = () => {
  const { formatMessage } = useIntl();
  const { formatAPIError } = useAPIErrorHandler();
  const { notifyStatus } = useNotifyAT();
  const toggleNotification = useNotification();

  const fetchDefaultLocalesList = async () => {
    try {
      const data = await request('/i18n/iso-locales', {
        method: 'GET',
      });

      return data;
    } catch (e) {
      toggleNotification({
        type: 'warning',
        message: formatAPIError(e),
      });

      return [];
    }
  };

  const { isLoading, data } = useQuery('default-locales', () =>
    fetchDefaultLocalesList(toggleNotification).then((data) => {
      notifyStatus(
        formatMessage({
          id: getTrad('Settings.locales.modal.locales.loaded'),
          defaultMessage: 'The locales have been successfully loaded.',
        })
      );

      return data;
    })
  );

  return { defaultLocales: data, isLoading };
};

export default useDefaultLocales;
