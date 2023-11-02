import parseISO from 'date-fns/parseISO';
import { useIntl } from 'react-intl';

const useFormatTimeStamp = () => {
  const { formatDate } = useIntl();

  const formatTimeStamp = (value) => {
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

export default useFormatTimeStamp;
