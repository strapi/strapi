import { useIntl } from 'react-intl';

export const useTranslations = () => {
  const { formatMessage } = useIntl();

  const t = (id: string, defaultMessage?: string) => {
    return formatMessage({ id, defaultMessage });
  };

  return { t };
};
