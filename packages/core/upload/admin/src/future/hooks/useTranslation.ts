import { useIntl } from 'react-intl';

import { pluginId } from '../../pluginId';

/**
 *
 * Wrapper around useIntl.formatMessage that prefixes the pluginId
 */
export const useTranslation = () => {
  const { formatMessage } = useIntl();

  function t(id: string, defaultMessage?: string, values?: Parameters<typeof formatMessage>[1]) {
    return formatMessage({ id: `${pluginId}.${id}`, defaultMessage }, values);
  }

  return { t };
};
