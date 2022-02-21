import { useQuery } from 'react-query';
import { useIntl } from 'react-intl';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import { useNotification } from '@strapi/helper-plugin';
import { fetchInstalledPlugins } from './utils/api';

const useFetchInstalledPlugins = title => {
  const toggleNotification = useNotification();
  const { formatMessage } = useIntl();
  const { notifyStatus } = useNotifyAT();

  const notifyLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: title || 'Plugins' }
      )
    );
  };

  return useQuery('list-installed-plugins', () => fetchInstalledPlugins(notifyLoad), {
    onError: () => {
      toggleNotification({
        type: 'warning',
        message: { id: 'notification.error', defaultMessage: 'An error occured' },
      });
    },
  });
};

export default useFetchInstalledPlugins;
