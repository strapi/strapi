import { useIntl } from 'react-intl';

import { getTrad } from '../../../utils/getTrad';

export const useTranslations = () => {
  const { formatMessage } = useIntl();

  const t = (id: string, defaultMessage?: string) => {
    return formatMessage({ id: getTrad(id), defaultMessage });
  };

  return { t };
};
