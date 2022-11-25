import { useIntl } from 'react-intl';

const useFormatTimeStamp = (value) => {
  const { formatDate } = useIntl();

  const formattedDateTime = formatDate(new Date(value), {
    dateStyle: 'long',
    timeStyle: 'medium',
    hourCycle: 'h24',
  });

  return formattedDateTime.replace(/\s+at/, ',');
};

export default useFormatTimeStamp;
