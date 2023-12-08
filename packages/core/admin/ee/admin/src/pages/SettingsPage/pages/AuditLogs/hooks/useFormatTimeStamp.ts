import parseISO from 'date-fns/parseISO';
import { useIntl } from 'react-intl';

export const useFormatTimeStamp = () => {
  const { formatDate } = useIntl();

  const formatTimeStamp = (value: string) => {
    const date = parseISO(value);

    const formattedDate = formatDate(date, {
      dateStyle: 'long',
    });
    const formattedTime = formatDate(date, {
      timeStyle: 'medium',
      hourCycle: 'h24',
    });

    return `${formattedDate}, ${formattedTime}`;
  };

  return formatTimeStamp;
};
